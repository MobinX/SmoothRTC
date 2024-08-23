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
        this._rtpAudioSenders = {};
        // local controls
        this._isAudioMuted = false;
        this._isVideoMuted = false;
        this._isScreenShareMuted = false;
        this._my_connid = '';
        // callback functions array
        this._onLocalVideoStream = [];
        this._onLocalAudioStream = [];
        this._PeerStateChanged = [];
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
                        this._remoteVideoStreams[connid].getVideoTracks().forEach(t => this._remoteVideoStreams[connid].removeTrack(t));
                        this._remoteVideoStreams[connid].addTrack(event.track);
                        // this._remoteVideoStreams[connid].getTracks().forEach(t => console.log(t));
                        _updatePeerState();
                    }
                    if (event.track.kind == 'audio') {
                        this._remoteAudioStreams[connid].getAudioTracks().forEach(t => this._remoteAudioStreams[connid].removeTrack(t));
                        this._remoteAudioStreams[connid].addTrack(event.track);
                        // this._remoteAudioStreams[connid].getTracks().forEach(t => console.log(t));
                        _updatePeerState();
                    }
                };
                this._peers_ids[connid] = connid;
                this._peerConnections[connid] = connection;
                this._politePeerStates[connid] = politePeerState;
                if (extraInfo) {
                    this._peersInfo[connid] = extraInfo;
                }
                _updatePeerState();
            }
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
