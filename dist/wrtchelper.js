"use strict";
// const response = await fetch("https://virsys.metered.live/api/v1/turn/credentials?apiKey=ca9f4e60bf446fc29401ccb1fa904d110708");
// const iceServers = await response.json();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function AddNewUser(other_user_id, connId) {
    var $newDiv = $('#otherTemplate').clone();
    $newDiv = $newDiv.attr('id', connId).addClass('other');
    $newDiv.find('h2').text(other_user_id);
    $newDiv.find('video').attr('id', 'v_' + connId);
    $newDiv.find('audio').attr('id', 'a_' + connId);
    $newDiv.show();
    $('#divUsers').append($newDiv);
}
var WrtcHelper = (function () {
    // let iceConfiguration = {
    //     //  iceServers: [
    //     //      {urls:'stun:stun.l.google.com:19302'},
    //     //  	{urls:'stun:stun1.l.google.com:19302'},
    //     //  	{urls:'stun:stun2.l.google.com:19302'},
    //     //  	{urls:'stun:stun3.l.google.com:19302'},
    //     //  	{urls:'stun:stun4.l.google.com:19302'},
    //     //    ]
    //     iceServers: iceServers
    // };
    let iceConfiguration;
    var _audioTrack;
    var peers_conns = [];
    var peers_con_ids = [];
    var politePeersState = [];
    var offerMakingStatePeers = [];
    var _remoteVideoStreams = [];
    var _remoteAudioStreams = [];
    var _localVideoPlayer;
    var _rtpVideoSenders = [];
    var _rtpAudioSenders = [];
    var _serverFn;
    var VideoStates = { None: 0, Camera: 1, ScreenShare: 2 };
    var _videoState = VideoStates.None;
    var _videoCamSSTrack;
    var _isAudioMute = true;
    var _my_connid = '';
    function _init(serFn, myconnid, iceServers) {
        return __awaiter(this, void 0, void 0, function* () {
            _my_connid = myconnid;
            _serverFn = serFn;
            iceConfiguration = {
                iceServers: iceServers
            };
            _localVideoPlayer = document.getElementById('localVideoCtr');
            // await ManageVideo(VideoStates.Camera); 
            eventBinding();
        });
    }
    function eventBinding() {
        $("#btnMuteUnmute").on('click', function () {
            return __awaiter(this, void 0, void 0, function* () {
                if (!_audioTrack) {
                    yield startwithAudio();
                }
                if (!_audioTrack) {
                    alert('problem with audio permission');
                    return;
                }
                if (_isAudioMute) {
                    _audioTrack.enabled = true;
                    $(this).text("Mute");
                    AddUpdateAudioVideoSenders(_audioTrack, _rtpAudioSenders);
                }
                else {
                    _audioTrack.enabled = false;
                    $(this).text("Unmute");
                    RemoveAudioVideoSenders(_rtpAudioSenders);
                }
                _isAudioMute = !_isAudioMute;
                console.log(_audioTrack);
            });
        });
        $("#btnStartStopCam").on('click', function () {
            return __awaiter(this, void 0, void 0, function* () {
                if (_videoState == VideoStates.Camera) { //Stop case
                    yield ManageVideo(VideoStates.None);
                }
                else {
                    yield ManageVideo(VideoStates.Camera);
                }
            });
        });
        $("#btnStartStopScreenshare").on('click', function () {
            return __awaiter(this, void 0, void 0, function* () {
                if (_videoState == VideoStates.ScreenShare) { //Stop case
                    yield ManageVideo(VideoStates.None);
                }
                else {
                    yield ManageVideo(VideoStates.ScreenShare);
                }
            });
        });
    }
    //Camera or Screen Share or None
    function ManageVideo(_newVideoState) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_newVideoState == VideoStates.None) {
                $("#btnStartStopCam").text('Start Camera');
                $("#btnStartStopScreenshare").text('Screen Share');
                _videoState = _newVideoState;
                ClearCurrentVideoCamStream(_rtpVideoSenders);
                return;
            }
            try {
                var vstream = null;
                if (_newVideoState == VideoStates.Camera) {
                    vstream = yield navigator.mediaDevices.getUserMedia({
                        video: {
                            width: 720,
                            height: 480
                        },
                        audio: false
                    });
                }
                else if (_newVideoState == VideoStates.ScreenShare) {
                    vstream = yield navigator.mediaDevices.getDisplayMedia({
                        video: {
                            width: 720,
                            height: 480
                        },
                        audio: false
                    });
                    vstream.oninactive = e => {
                        ClearCurrentVideoCamStream(_rtpVideoSenders);
                        $("#btnStartStopScreenshare").text('Screen Share');
                    };
                }
                ClearCurrentVideoCamStream(_rtpVideoSenders);
                _videoState = _newVideoState;
                if (_newVideoState == VideoStates.Camera) {
                    $("#btnStartStopCam").text('Stop Camera');
                    $("#btnStartStopScreenshare").text('Screen Share');
                }
                else if (_newVideoState == VideoStates.ScreenShare) {
                    $("#btnStartStopCam").text('Start Camera');
                    $("#btnStartStopScreenshare").text('Stop Screen Share');
                }
                if (vstream && vstream.getVideoTracks().length > 0) {
                    _videoCamSSTrack = vstream.getVideoTracks()[0];
                    if (_videoCamSSTrack) {
                        _localVideoPlayer.srcObject = new MediaStream([_videoCamSSTrack]);
                        AddUpdateAudioVideoSenders(_videoCamSSTrack, _rtpVideoSenders);
                    }
                }
            }
            catch (e) {
                console.log(e);
                return;
            }
        });
    }
    function ClearCurrentVideoCamStream(rtpVideoSenders) {
        if (_videoCamSSTrack) {
            _videoCamSSTrack.stop();
            _videoCamSSTrack = null;
            _localVideoPlayer.srcObject = null;
            RemoveAudioVideoSenders(rtpVideoSenders);
        }
    }
    function RemoveAudioVideoSenders(rtpSenders) {
        return __awaiter(this, void 0, void 0, function* () {
            for (var con_id in peers_con_ids) {
                if (rtpSenders[con_id] && IsConnectionAvailable(peers_conns[con_id])) {
                    peers_conns[con_id].removeTrack(rtpSenders[con_id]);
                    rtpSenders[con_id] = null;
                }
            }
        });
    }
    function AddUpdateAudioVideoSenders(track, rtpSenders) {
        return __awaiter(this, void 0, void 0, function* () {
            for (var con_id in peers_con_ids) {
                if (IsConnectionAvailable(peers_conns[con_id])) {
                    if (rtpSenders[con_id] && rtpSenders[con_id].track) {
                        rtpSenders[con_id].replaceTrack(track);
                    }
                    else {
                        rtpSenders[con_id] = peers_conns[con_id].addTrack(track);
                    }
                }
            }
        });
    }
    function startwithAudio() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                var astream = yield navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                _audioTrack = astream.getAudioTracks()[0];
                _audioTrack.onmute = function (e) {
                    console.log(e);
                };
                _audioTrack.onunmute = function (e) {
                    console.log(e);
                };
                _audioTrack.enabled = false;
            }
            catch (e) {
                console.log(e);
                return;
            }
        });
    }
    function createConnection(connid, peerSate) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('createConnection', connid, iceConfiguration);
            var connection = new RTCPeerConnection(iceConfiguration);
            connection.onicecandidate = function (event) {
                console.log('onicecandidate', event.candidate);
                if (event.candidate) {
                    _serverFn(JSON.stringify({ 'iceCandidate': event.candidate }), connid);
                }
            };
            connection.onicecandidateerror = function (event) {
                console.log('onicecandidateerror', event);
            };
            connection.onicegatheringstatechange = function (event) {
                console.log('onicegatheringstatechange', event);
            };
            connection.onnegotiationneeded = function (event) {
                return __awaiter(this, void 0, void 0, function* () {
                    console.log('onnegotiationneeded', event);
                    yield _createOffer(connid);
                });
            };
            connection.oniceconnectionstatechange = () => {
                console.log(this.id + ' peer ice connection state: ', connection.iceConnectionState);
                if (connection.iceConnectionState === "failed") {
                    connection.restartIce();
                }
            };
            connection.onconnectionstatechange = function (event) {
                console.log('onconnectionstatechange', event.currentTarget.connectionState);
                if (event.currentTarget.connectionState === "connected") {
                    console.log('connected');
                }
                if (event.currentTarget.connectionState === "disconnected") {
                    console.log('disconnected');
                }
            };
            // New remote media stream was added
            connection.ontrack = function (event) {
                // event.track.onunmute = () => {
                //     alert('unmuted');
                // };     
                if (!_remoteVideoStreams[connid]) {
                    _remoteVideoStreams[connid] = new MediaStream();
                }
                if (!_remoteAudioStreams[connid])
                    _remoteAudioStreams[connid] = new MediaStream();
                if (event.track.kind == 'video') {
                    _remoteVideoStreams[connid].getVideoTracks().forEach(t => _remoteVideoStreams[connid].removeTrack(t));
                    _remoteVideoStreams[connid].addTrack(event.track);
                    //_remoteVideoStreams[connid].getTracks().forEach(t => console.log(t));
                    var _remoteVideoPlayer = document.getElementById('v_' + connid);
                    _remoteVideoPlayer.srcObject = null;
                    _remoteVideoPlayer.srcObject = _remoteVideoStreams[connid];
                    _remoteVideoPlayer.load();
                    //$(_remoteVideoPlayer).show();
                    // event.track.onmute = function() {
                    //     console.log(connid + ' muted');
                    //    console.log(this.muted+ ' muted');
                    //    console.log(event.track.muted+ ' muted');
                    //    console.log(this.readyState+ ' muted');
                    //    console.log('muted',this);
                    //    console.log('muted',_remoteVideoStreams[connid] );
                    //    console.log('muted',_remoteVideoPlayer.paused);
                    //    console.log('muted',_remoteVideoPlayer.readyState );
                    //    console.log('muted',_remoteVideoPlayer.ended );
                    //    if(this.muted){
                    //     //_remoteVideoPlayer.srcObject = null;
                    //    }
                    // };
                }
                else if (event.track.kind == 'audio') {
                    var _remoteAudioPlayer = document.getElementById('a_' + connid);
                    _remoteAudioStreams[connid].getVideoTracks().forEach(t => _remoteAudioStreams[connid].removeTrack(t));
                    _remoteAudioStreams[connid].addTrack(event.track);
                    _remoteAudioPlayer.srcObject = null;
                    _remoteAudioPlayer.srcObject = _remoteAudioStreams[connid];
                    _remoteAudioPlayer.load();
                }
            };
            peers_con_ids[connid] = connid;
            peers_conns[connid] = connection;
            politePeersState[connid] = peerSate;
            if (_videoState == VideoStates.Camera || _videoState == VideoStates.ScreenShare) {
                if (_videoCamSSTrack) {
                    AddUpdateAudioVideoSenders(_videoCamSSTrack, _rtpVideoSenders);
                }
            }
            return connection;
        });
    }
    function _createOffer(connid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                //await createConnection();
                var connection = peers_conns[connid];
                offerMakingStatePeers[connid] = true;
                console.log('connection.signalingState:' + connection.signalingState);
                var offer = yield connection.createOffer();
                yield connection.setLocalDescription(offer);
                //Send offer to Server
                _serverFn(JSON.stringify({ 'offer': connection.localDescription }), connid);
            }
            catch (err) {
                console.error(err);
            }
            finally {
                offerMakingStatePeers[connid] = false;
            }
        });
    }
    function exchangeSDP(message, from_connid) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('messag', message);
            message = JSON.parse(message);
            if (message.answer) {
                console.log('answer', message.answer);
                yield peers_conns[from_connid].setRemoteDescription(new RTCSessionDescription(message.answer));
                console.log('connection', peers_conns[from_connid]);
            }
            else if (message.offer) {
                console.log('offer', message.offer);
                if (!peers_conns[from_connid]) {
                    console.log("after offter , no peer creating connection", from_connid);
                    yield createConnection(from_connid, false);
                    AddNewUser(from_connid, from_connid);
                }
                const offerCollision = (offerMakingStatePeers[from_connid] || peers_conns[from_connid].signalingState !== "stable");
                if (offerCollision && !politePeersState[from_connid]) {
                    console.log("ignoring Offer", from_connid);
                    return;
                }
                yield peers_conns[from_connid].setRemoteDescription(new RTCSessionDescription(message.offer));
                var answer = yield peers_conns[from_connid].createAnswer();
                yield peers_conns[from_connid].setLocalDescription();
                _serverFn(JSON.stringify({ 'answer': peers_conns[from_connid].localDescription }), from_connid);
            }
            else if (message.iceCandidate) {
                console.log('iceCandidate', message.iceCandidate);
                if (!peers_conns[from_connid]) {
                    console.log("after offter , no peer creating connection", from_connid);
                    yield createConnection(from_connid, false);
                    AddNewUser(from_connid, from_connid);
                }
                try {
                    yield peers_conns[from_connid].addIceCandidate(message.iceCandidate);
                }
                catch (e) {
                    console.log(e);
                }
            }
        });
    }
    function IsConnectionAvailable(connection) {
        if (connection &&
            (connection.connectionState == "new"
                || connection.connectionState == "connecting"
                || connection.connectionState == "connected")) {
            return true;
        }
        else
            return false;
    }
    function closeConnection(connid) {
        peers_con_ids[connid] = null;
        if (peers_conns[connid]) {
            peers_conns[connid].close();
            peers_conns[connid] = null;
        }
        if (_remoteAudioStreams[connid]) {
            _remoteAudioStreams[connid].getTracks().forEach(t => {
                if (t.stop)
                    t.stop();
            });
            _remoteAudioStreams[connid] = null;
        }
        if (_remoteVideoStreams[connid]) {
            _remoteVideoStreams[connid].getTracks().forEach(t => {
                if (t.stop)
                    t.stop();
            });
            _remoteVideoStreams[connid] = null;
        }
    }
    return {
        init: function (serverFn, my_connid, iceServers) {
            return __awaiter(this, void 0, void 0, function* () {
                yield _init(serverFn, my_connid, iceServers);
            });
        },
        ExecuteClientFn: function (data, from_connid) {
            return __awaiter(this, void 0, void 0, function* () {
                yield exchangeSDP(data, from_connid);
            });
        },
        createNewConnection: function (connid_1) {
            return __awaiter(this, arguments, void 0, function* (connid, peerState = true) {
                yield createConnection(connid, peerState);
            });
        },
        closeExistingConnection: function (connid) {
            closeConnection(connid);
        }
    };
}());
