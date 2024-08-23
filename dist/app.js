

class WebrtcBase {
    constructor(my_connid, iceConfiguration, serverFn) {
        this._iceConfiguration = null;
        // local tracks
        this._audioTrack = null;
        this._videoTrack = null;
        this._screenShareTrack = null;
        // peer states
        this._peerConnections = {};
        this._peers_ids = {};
        this._peersInfo = {};
        this._politePeerStates = {};
        this._offferMakingStatePeers = {};
        // remote tracks
        this._remoteAudioStreams = {};
        this._remoteVideoStreams = {};
        this._remoteScreenShareStreams = {};
        this._rtpVideoSenders = {};
        this._rtpScreenShareSenders = {};
        this._rtpAudioSenders = {};
        // local controls
        this._isAudioMuted = true;
        this._isVideoMuted = true;
        this._isScreenShareMuted = true;
        this._my_connid = '';
        // callback functions array
        this._onCameraVideoStateChanged = [];
        this._onScreenShareVideoStateChanged = [];
        this._onAudioStateChanged = [];
        this._onPeerStateChanged = [];
        this._onError = [];
        this._my_connid = my_connid;
        this._serverFn = serverFn;
        this._iceConfiguration = iceConfiguration;
    }
    // connections management
    _AlterAudioVideoSenders(track, rtpSenders) {
        for (let conId in this._peers_ids) {
            if (this._peerConnections[conId] && this._isConnectionAlive(this._peerConnections[conId])) {
                if (rtpSenders[conId] && rtpSenders[conId].track) {
                    rtpSenders[conId].replaceTrack(track);
                }
                else {
                    rtpSenders[conId] = this._peerConnections[conId].addTrack(track);
                }
            }
        }
    }
    createConnection(connid_1, politePeerState_1) {
        return __awaiter(this, arguments, void 0, function* (connid, politePeerState, extraInfo = null) {
            if (this._iceConfiguration && !this._peerConnections[connid]) {
                let connection = new RTCPeerConnection({
                    iceServers: [
                        {
                            "urls": "stun:stun.relay.metered.ca:80"
                        },
                        {
                            "urls": "turn:standard.relay.metered.ca:80",
                            "username": "9bc1f0c0169adfad344ffc70",
                            "credential": "1yiBhcp4fP8smWv8"
                        },
                        {
                            "urls": "turn:standard.relay.metered.ca:80?transport=tcp",
                            "username": "9bc1f0c0169adfad344ffc70",
                            "credential": "1yiBhcp4fP8smWv8"
                        },
                        {
                            "urls": "turn:standard.relay.metered.ca:443",
                            "username": "9bc1f0c0169adfad344ffc70",
                            "credential": "1yiBhcp4fP8smWv8"
                        },
                        {
                            "urls": "turns:standard.relay.metered.ca:443?transport=tcp",
                            "username": "9bc1f0c0169adfad344ffc70",
                            "credential": "1yiBhcp4fP8smWv8"
                        }
                    ]
                });
                connection.onicecandidate = (event) => {
                    if (event.candidate) {
                        this._serverFn(JSON.stringify({ 'iceCandidate': event.candidate }), connid);
                    }
                };
                connection.onicecandidateerror = (event) => {
                    console.log(connid + ' onicecandidateerror', event);
                    this._emitError("Failed to Gather ICE Candidate");
                };
                connection.onicegatheringstatechange = (event) => {
                    console.log(connid + ' onicegatheringstatechange', event);
                };
                connection.oniceconnectionstatechange = () => {
                    console.log(connid + ' peer ice connection state: ', connection.iceConnectionState);
                    if (connection.iceConnectionState === "failed") {
                        connection.restartIce();
                    }
                };
                connection.onnegotiationneeded = (event) => __awaiter(this, void 0, void 0, function* () {
                    console.log(connid + ' onnegotiationneeded', event);
                    yield this._createOffer(connid);
                });
                connection.onconnectionstatechange = (event) => {
                    var _a;
                    console.log(connid + ' onconnectionstatechange', (_a = event === null || event === void 0 ? void 0 : event.currentTarget) === null || _a === void 0 ? void 0 : _a.connectionState);
                    if (event.currentTarget.connectionState === "connected") {
                        console.log(connid + ' connected');
                    }
                    if (event.currentTarget.connectionState === "disconnected") {
                        console.log(connid + ' disconnected');
                    }
                };
                connection.ontrack = (event) => {
                    console.log(connid + ' ontrack', event);
                    if (!this._remoteVideoStreams[connid]) {
                        this._remoteVideoStreams[connid] = new MediaStream();
                    }
                    if (!this._remoteAudioStreams[connid]) {
                        this._remoteAudioStreams[connid] = new MediaStream();
                    }
                    if (event.track.kind == 'video') {
                        if (event.track.label == 'screen') {
                            this._remoteScreenShareStreams[connid] = new MediaStream();
                            this._remoteScreenShareStreams[connid].addTrack(event.track);
                        }
                        else {
                            this._remoteVideoStreams[connid].getVideoTracks().forEach(t => { var _a; return (_a = this._remoteVideoStreams[connid]) === null || _a === void 0 ? void 0 : _a.removeTrack(t); });
                            this._remoteVideoStreams[connid].addTrack(event.track);
                            // this._remoteVideoStreams[connid].getTracks().forEach(t => console.log(t));
                        }
                        this._updatePeerState();
                    }
                    if (event.track.kind == 'audio') {
                        this._remoteAudioStreams[connid].getAudioTracks().forEach(t => { var _a; return (_a = this._remoteAudioStreams[connid]) === null || _a === void 0 ? void 0 : _a.removeTrack(t); });
                        this._remoteAudioStreams[connid].addTrack(event.track);
                        // this._remoteAudioStreams[connid].getTracks().forEach(t => console.log(t));
                        this._updatePeerState();
                    }
                };
                this._peers_ids[connid] = connid;
                this._peerConnections[connid] = connection;
                this._politePeerStates[connid] = politePeerState;
                yield this._createOffer(connid);
                if (extraInfo) {
                    this._peersInfo[connid] = extraInfo;
                }

                if (this._videoTrack) {
                    this._AlterAudioVideoSenders(this._videoTrack, this._rtpVideoSenders)
                }
                if (this._audioTrack) {
                    this._AlterAudioVideoSenders(this._audioTrack, this._rtpAudioSenders)
                }
                if (this._screenTrack) {
                    this._AlterAudioVideoSenders(this._screenTrack, this._rtpScreenSenders)
                }
                this._updatePeerState();
            }
        });
    }
    _createOffer(connid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let connection = this._peerConnections[connid];
                if (connection != null) {
                    this._offferMakingStatePeers[connid] = true;
                    console.log(connid + ' creating offer: connenction.signalingState:' + (connection === null || connection === void 0 ? void 0 : connection.signalingState));
                    let offer = yield (connection === null || connection === void 0 ? void 0 : connection.createOffer());
                    yield (connection === null || connection === void 0 ? void 0 : connection.setLocalDescription(offer));
                    this._serverFn(JSON.stringify({ 'offer': connection === null || connection === void 0 ? void 0 : connection.localDescription }), connid);
                }
            }
            catch (err) {
                console.log(err);
                this._emitError(err);
            }
            finally {
                this._offferMakingStatePeers[connid] = false;
            }
        });
    }
    onSocketMessage(message_1, from_connid_1) {
        return __awaiter(this, arguments, void 0, function* (message, from_connid, extraInfo = null) {
            var _a, _b;
            console.log(from_connid + ' onSocketMessage', message);
            let msg = JSON.parse(message);
            if (msg.iceCandidate) {
                if (!this._peerConnections[from_connid]) {
                    console.log('peer ' + from_connid + ' not found , creating connection for ice candidate');
                    yield this.createConnection(from_connid, false, extraInfo);
                }
                try {
                    yield ((_a = this._peerConnections[from_connid]) === null || _a === void 0 ? void 0 : _a.addIceCandidate(msg.iceCandidate));
                }
                catch (err) {
                    console.log(err);
                    this._emitError("falled to add ice candidate");
                }
            }
            else if (msg.offer) {
                console.log(from_connid, ' offer', msg.offer);
                if (!this._peerConnections[from_connid]) {
                    console.log('peer ' + from_connid + ' not found , creating connection for offer');
                    yield this.createConnection(from_connid, false, extraInfo);
                }
                try {
                    if (this._peerConnections[from_connid]) {
                        const offerCollision = (this._offferMakingStatePeers[from_connid] || ((_b = this._peerConnections[from_connid]) === null || _b === void 0 ? void 0 : _b.signalingState) !== "stable");
                        if (offerCollision && !this._politePeerStates[from_connid]) {
                            console.log("ignoring Offer", from_connid);
                            return;
                        }
                        yield this._peerConnections[from_connid].setRemoteDescription(new RTCSessionDescription(msg.offer));
                        let answer = yield this._peerConnections[from_connid].createAnswer();
                        yield this._peerConnections[from_connid].setLocalDescription();
                        this._serverFn(JSON.stringify({ 'answer': this._peerConnections[from_connid].localDescription }), from_connid);
                    }
                }
                catch (err) {
                    console.log(err);
                    this._emitError("falled to create answer");
                }
            }
            else if (msg.answer) {
                try {
                    if (this._peerConnections[from_connid]) {
                        console.log(from_connid, ' answer', msg.answer);
                        yield this._peerConnections[from_connid].setRemoteDescription(new RTCSessionDescription(msg.answer));
                    }
                }
                catch (err) {
                    console.log(err);
                    this._emitError("falled to set remote description");
                }
            }
        });
    }
    _isConnectionAlive(connenction) {
        if (connenction && connenction.connectionState == "connected" ||
            connenction.connectionState == "new" ||
            connenction.connectionState == "connecting")
            return true;
        else
            return false;
    }
    closeConnection(connid) {
        if (this._peerConnections[connid]) {
            this._peers_ids[connid] = null;
            this._peerConnections[connid].close();
            this._peerConnections[connid] = null;
        }
        if (this._remoteAudioStreams[connid]) {
            this._remoteAudioStreams[connid].getTracks().forEach(t => t.stop && t.stop());
            this._remoteAudioStreams[connid] = null;
        }
        if (this._remoteVideoStreams[connid]) {
            this._remoteVideoStreams[connid].getTracks().forEach(t => t.stop && t.stop());
            this._remoteVideoStreams[connid] = null;
        }
        if (this._remoteScreenShareStreams[connid]) {
            this._remoteScreenShareStreams[connid].getTracks().forEach(t => t.stop && t.stop());
            this._remoteScreenShareStreams[connid] = null;
        }
        this._updatePeerState();
    }
    onPeerStateChange(fn) {
        this._onPeerStateChanged.push(fn);
    }
    _updatePeerState() {
        let peerProperties = [];
        for (let connid in this._peerConnections) {
            if (this._peerConnections[connid]) {
                peerProperties.push({
                    socketId: connid,
                    info: this._peersInfo[connid],
                    isAudioOn: this._remoteAudioStreams[connid] != null && this._remoteAudioStreams[connid]?.getAudioTracks()[0]?.enabled,
                    isVideoOn: this._remoteVideoStreams[connid] != null && this._remoteVideoStreams[connid]?.getVideoTracks()[0]?.enabled,
                    isScreenShareOn: this._remoteScreenShareStreams[connid] != null && this._remoteScreenShareStreams[connid]?.getVideoTracks()[0]?.enabled,
                    audioStream: this._remoteAudioStreams[connid],
                    videoStream: this._remoteVideoStreams[connid],
                    screenShareStream: this._remoteScreenShareStreams[connid],
                    isPolite: this._politePeerStates[connid]
                });
            }
        }
        console.log(peerProperties);
        this._onPeerStateChanged.forEach(fn => fn(peerProperties));
    }

    _RemoveAudioVideoSenders(rtpSenders) {
        for (let conId in this._peers_ids) {
            if (this._peerConnections[conId] && this._isConnectionAlive(this._peerConnections[conId])) {
                if (rtpSenders[conId] && rtpSenders[conId].track) {
                    this._peerConnections[conId].removeTrack(rtpSenders[conId]);
                    rtpSenders[conId] = null;
                }
            }
        }
    }
    _ClearCameraVideoStreams(_rtpVideoSenders) {
        if (this._videoTrack) {
            this._videoTrack.enabled = false;
            this._videoTrack.stop();
            this._videoTrack = null;
            this._RemoveAudioVideoSenders(_rtpVideoSenders);
        }
    }
    _ClearScreenVideoStreams(_rtpScreenSenders) {
        if (this._screenShareTrack) {
            this._screenShareTrack.enabled = false;
            this._screenShareTrack.stop();
            this._screenShareTrack = null;
            this._RemoveAudioVideoSenders(_rtpScreenSenders);
        }
    }
    _ClearAudioStreams(_rtpAudioSenders) {
        if (this._audioTrack) {
            this._audioTrack.enabled = false;
            this._audioTrack.stop();
            this._audioTrack = null;
            this._RemoveAudioVideoSenders(_rtpAudioSenders);
        }
    }
    startCamera() {
        return __awaiter(this, arguments, void 0, function* (cameraConfig = {
            video: {
                width: 640,
                height: 480
            },
            audio: false
        }) {
            try {
                let videoStream = yield navigator.mediaDevices.getUserMedia(cameraConfig);
                this._ClearCameraVideoStreams(this._rtpVideoSenders);
                if (videoStream && videoStream.getVideoTracks().length > 0) {
                    this._videoTrack = videoStream.getVideoTracks()[0];
                    this._emitCameraVideoState(true);
                    this._AlterAudioVideoSenders(this._videoTrack, this._rtpVideoSenders);
                }
                this._isVideoMuted = false;
            }
            catch (e) {
                console.log(e);
                this._emitError("Failed to start camera");
            }
        });
    }
    _emitCameraVideoState(state) {
        this._onCameraVideoStateChanged.forEach(fn => fn(state, (this._videoTrack && new MediaStream([this._videoTrack]))));
    }
    onCameraVideoStateChange(fn) {
        this._onCameraVideoStateChanged.push(fn);
    }
    _emitScreenShareState(state) {
        this._onScreenShareVideoStateChanged.forEach(fn => fn(state, (this._screenShareTrack && new MediaStream([this._screenShareTrack]))));
    }
    onScreenShareVideoStateChange(fn) {
        this._onScreenShareVideoStateChanged.push(fn);
    }
    _emitAudioState(state) {
        this._onAudioStateChanged.forEach(fn => fn(state, (this._audioTrack && new MediaStream([this._audioTrack]))));
    }
    onAudioStateChange(fn) {
        this._onAudioStateChanged.push(fn);
    }
    stopCamera() {
        this._ClearCameraVideoStreams(this._rtpVideoSenders);
        this._emitCameraVideoState(false);
        this._isVideoMuted = true;
    }
    toggleCamera() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isVideoMuted)
                yield this.startCamera();
            else
                this.stopCamera();
        });
    }
    startScreenShare() {
        return __awaiter(this, arguments, void 0, function* (screenConfig = {
            video: {
                width: 640,
                height: 480
            },
            audio: false
        }) {
            try {
                let screenStream = yield navigator.mediaDevices.getDisplayMedia(screenConfig);
                screenStream.oninactive = (e) => {
                    this._ClearScreenVideoStreams(this._rtpScreenShareSenders);
                    this._emitScreenShareState(false);
                };
                this._ClearScreenVideoStreams(this._rtpScreenShareSenders);
                if (screenStream && screenStream.getVideoTracks().length > 0) {
                    // set the screen share track label as "screen"
                    screenStream.getVideoTracks()[0].label = "screen";
                    this._screenShareTrack = screenStream.getVideoTracks()[0];
                    this._emitScreenShareState(true);
                    this._AlterAudioVideoSenders(this._screenShareTrack, this._rtpScreenShareSenders);
                }
                this._isScreenShareMuted = false;
            }
            catch (e) {
                console.log(e);
                this._emitError("Failed to start screen share");
            }
        });
    }
    stopScreenShare() {
        this._ClearScreenVideoStreams(this._rtpScreenShareSenders);
        this._emitScreenShareState(false);
        this._isScreenShareMuted = true;
    }
    startAudio() {
        return __awaiter(this, void 0, void 0, function* () {

            try {
                if (!this._audioTrack) {
                    let audioStream = yield navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: true
                    });
                    this._audioTrack = audioStream.getAudioTracks()[0];
                }
                if (this._isAudioMuted) {
                    this._audioTrack.enabled = true;
                    this._isAudioMuted = false;
                    this._AlterAudioVideoSenders(this._audioTrack, this._rtpAudioSenders);
                    this._emitAudioState(true);
                }
            }
            catch (e) {
                console.log(e);
                this._emitError("Failed to start audio");
            }

        });
    }
    stopAudio() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._audioTrack) {
                this._audioTrack.enabled = false;
                this._isAudioMuted = true;
                this._RemoveAudioVideoSenders(this._rtpAudioSenders);
                this._emitAudioState(false);
            }
        });
    }
    toggleAudio() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isAudioMuted)
                yield this.startAudio();
            else
                yield this.stopAudio();
        });
    }
    // callback handlers
    onError(fn) {
        this._onError.push(fn);
    }
    _emitError(error) {
        this._onError.forEach(fn => fn(error));
    }
}



var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// import WebrtcBase from "./peerx.ts";
(() => __awaiter(void 0, void 0, void 0, function* () {
    const response2 = yield fetch('https://global.xirsys.net/_turn/sigflow', {
        method: 'PUT',
        headers: {
            'Authorization': 'Basic ' + btoa('mobin:e2d2ad94-0e2b-11eb-85a4-0242ac150006'),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });
    const data = yield response2.json();
    const response = yield fetch("https://virsys.metered.live/api/v1/turn/credentials?apiKey=ca9f4e60bf446fc29401ccb1fa904d110708");

    console.log('response: ', data);
    // const iceServers = await response.json();
    // const iceServers = data.v.iceServers
    const iceServers = yield response.json();
    // 
    let isWrtcInit = false;
    const ably = new Ably.Realtime({ key: 'YSXfdw.ksCpsA:Bf6jKYu4LPPpMfiFkSMJrZ4q4ArLDkuBf7bJCPxKQUo', clientId: Math.random().toString(36).substring(7) });
    ably.connection.once('connected').then(() => __awaiter(void 0, void 0, void 0, function* () {
        const response2 = yield fetch('https://global.xirsys.net/_turn/sigflow', {
            method: 'PUT',
            headers: {
                'Authorization': 'Basic ' + btoa('mobin:e2d2ad94-0e2b-11eb-85a4-0242ac150006'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        const data = yield response2.json();
        console.log('response: ', data);
        // const iceServers = await response.json();
        const iceServers = data.v.iceServers;
        if (!isWrtcInit) {
            // webRt = new WebrtcBase(sendmsg, ably.auth.clientId, iceServers);
            isWrtcInit = true;
        }
        console.log('Connected to Ably!');
    }));
    console.log(iceServers)
    let webRt = new WebrtcBase(ably.auth.clientId, { iceServers: iceServers }, sendmsg,);//new WebrtcBase(sendmsg, ably.auth.clientId, iceServers);

    const myid = ably.auth.clientId;
    console.log('myid: ', myid);
    const channel = ably.channels.get('quickstart');
    document.title = myid;
    function sendmsg(msg, to) {
        return __awaiter(this, void 0, void 0, function* () {
            yield channel.publish('greeting', { data: msg, clientId: myid, to: to });
            console.log('message sent: ', msg);
        });
    }
    yield channel.subscribe('greeting', (message) => __awaiter(void 0, void 0, void 0, function* () {
        // clientid ==  sender from
        // id == receiver (to)
        if (message.clientId === myid) {
            //checking i am not worikng on my own msg
            return;
        }
        else {
            if (message.data.to === myid) {
                //checking if the msg is for me
                console.log('message received from: ' + message.clientId);
                if (!isWrtcInit) {
                    const response2 = yield fetch('https://global.xirsys.net/_turn/sigflow', {
                        method: 'PUT',
                        headers: {
                            'Authorization': 'Basic ' + btoa('mobin:e2d2ad94-0e2b-11eb-85a4-0242ac150006'),
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({})
                    });
                    const data = yield response2.json();
                    console.log('response: ', data);
                    // const iceServers = await response.json();
                    const iceServers = data.v.iceServers;
                    if (!isWrtcInit) {
                        // webRt = new WebrtcBase(sendmsg, ably.auth.clientId, iceServers);
                        isWrtcInit = true;
                    }
                }
                console.log(message);
                yield webRt.onSocketMessage(message.data.data, message.clientId);
            }
        }
    }));
    let _localVideoPlayer = document.getElementById('localVideoCtr');
    webRt.onCameraVideoStateChange((state, stream) => {
        if (state) {
            _localVideoPlayer.srcObject = stream;
        }
        else {
            _localVideoPlayer.srcObject = null;
        }
    });
    $("#btnMuteUnmute").on('click', function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield webRt.toggleAudio();
        });
    });
    $("#btnStartStopCam").on('click', function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield webRt.toggleCamera();
        });
    });
    webRt.onPeerStateChange((peerstate) => {
        if (peerstate) {
            console.log("peerstate", peerstate);
            for (let peerz in peerstate) {
                let pr = peerstate[peerz];
                let remoteElm = document.getElementById(peerstate[peerz].socketId);
                if (!remoteElm) {
                    AddNewUser(peerstate[peerz].socketId, peerstate[peerz].socketId);
                }
                let video = remoteElm.querySelector('video'), audio = remoteElm.querySelector('audio');
                if (pr.isAudioOn) {
                    if (audio) {
                        audio.srcObject = peerstate[peerz].audioStream;
                        audio.play();
                    }
                }
                else {
                    if (audio) {
                        audio.srcObject = null;
                    }
                }
                if (pr.isVideoOn) {
                    if (video) {
                        video.srcObject = peerstate[peerz].videoStream;
                        video.play();
                    }
                }
                else {
                    if (video) {
                        video.srcObject = null;
                    }
                }
            }
        }
    });
    channel.presence.subscribe('enter', function (member) {
        return __awaiter(this, void 0, void 0, function* () {
            if (member.clientId === myid) {
                return;
            }
            console.log("informAboutNewConnection", member);
            AddNewUser(member.clientId, member.clientId);
            webRt.createConnection(member.clientId, true);
        });
    });
    channel.presence.subscribe('leave', function (member) {
        return __awaiter(this, void 0, void 0, function* () {
            if (member.clientId === myid) {
                return;
            }
            $('#' + member.clientId).remove();
            webRt.closeConnection(member.clientId);
        });
    });
    channel.presence.get(function (err, other_users) {
        console.log("userconnected", other_users);
        $('#divUsers .other').remove();
        if (other_users) {
            for (var i = 0; i < other_users.length; i++) {
                AddNewUser(other_users[i].clientId, other_users[i].clientId);
                webRt.createConnection(other_users[i].clientId, false);
            }
        }
        $(".toolbox").show();
        $('#messages').show();
        $('#divUsers').show();
    });
    $('#btnResetMeeting').on('click', function () {
        socket.emit('reset');
    });
    $('#btnsend').on('click', function () {
        //_hub.server.sendMessage($('#msgbox').val());
        socket.emit('sendMessage', $('#msgbox').val());
        $('#msgbox').val('');
    });
    $('#divUsers').on('dblclick', 'video', function () {
        this.requestFullscreen();
    });
    function AddNewUser(other_user_id, connId) {
        var $newDiv = $('#otherTemplate').clone();
        $newDiv = $newDiv.attr('id', connId).addClass('other');
        $newDiv.find('h2').text(other_user_id);
        $newDiv.find('video').attr('id', 'v_' + connId);
        $newDiv.find('audio').attr('id', 'a_' + connId);
        $newDiv.show();
        $('#divUsers').append($newDiv);
    }
    channel.presence.enter("mobin");
}))();
