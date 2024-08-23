"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebrtcBase = void 0;
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
        this._onLocalVideoStream = [];
        this._onLocalAudioStream = [];
        this._onPeerStateChanged = [];
        this._onError = [];
        this._my_connid = my_connid;
        this._serverFn = serverFn;
        this._iceConfiguration = iceConfiguration;
    }
    // connections management
    createConnection(connid_1, politePeerState_1) {
        return __awaiter(this, arguments, void 0, function* (connid, politePeerState, extraInfo = null) {
            if (this._iceConfiguration) {
                let connection = new RTCPeerConnection(this._iceConfiguration);
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
                        this._remoteVideoStreams[connid].getVideoTracks().forEach(t => { var _a; return (_a = this._remoteVideoStreams[connid]) === null || _a === void 0 ? void 0 : _a.removeTrack(t); });
                        this._remoteVideoStreams[connid].addTrack(event.track);
                        // this._remoteVideoStreams[connid].getTracks().forEach(t => console.log(t));
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
                if (extraInfo) {
                    this._peersInfo[connid] = extraInfo;
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
                    isAudioOn: this._remoteAudioStreams[connid] != null && this._remoteAudioStreams[connid].getAudioTracks()[0].enabled,
                    isVideoOn: this._remoteVideoStreams[connid] != null && this._remoteVideoStreams[connid].getVideoTracks()[0].enabled,
                    isScreenShareOn: this._remoteScreenShareStreams[connid] != null && this._remoteScreenShareStreams[connid].getVideoTracks()[0].enabled,
                    audioStream: this._remoteAudioStreams[connid],
                    videoStream: this._remoteVideoStreams[connid],
                    screenShareStream: this._remoteScreenShareStreams[connid],
                    isPolite: this._politePeerStates[connid]
                });
            }
        }
        this._onPeerStateChanged.forEach(fn => fn(peerProperties));
    }
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
            this._videoTrack.stop();
            this._videoTrack = null;
            this._RemoveAudioVideoSenders(_rtpVideoSenders);
        }
    }
    _ClearScreenVideoStreams(_rtpScreenSenders) {
        if (this._screenShareTrack) {
            this._screenShareTrack.stop();
            this._screenShareTrack = null;
            this._RemoveAudioVideoSenders(_rtpScreenSenders);
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
        this._onCameraVideoStateChange.forEach(fn => fn(state, (this._videoTrack && new MediaStream([this._videoTrack]))));
    }
    _emitScreenShareState(state) {
        this._onScreenShareStateChange.forEach(fn => fn(state, (this._screenShareTrack && new MediaStream([this._screenShareTrack]))));
    }
    _emitAudioState(state) {
        this._onAudioStateChange.forEach(fn => fn(state, (this._audioTrack && new MediaStream([this._audioTrack]))));
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
            if (!this._audioTrack) {
                try {
                    let audioStream = yield navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: true
                    });
                    this._audioTrack = audioStream.getAudioTracks()[0];
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
exports.WebrtcBase = WebrtcBase;
