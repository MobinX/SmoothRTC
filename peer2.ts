interface PeerStateChangedHandler {
    (peerState: {
        socketId: string,
        info: any
        isAudioOn: boolean,
        isVideoOn: boolean,
        isScreenShareOn: boolean
        audioStream: MediaStream | null,
        videoStream: MediaStream | null,
        screenShareStream: MediaStream | null
        isPolite: boolean


    }[]): void;
}

export class WebrtcBase {
    private _iceConfiguration: RTCConfiguration | null = null
    // local tracks
    private _audioTrack: MediaStreamTrack | null = null
    private _videoTrack: MediaStreamTrack | null = null
    private _screenShareTrack: MediaStreamTrack | null = null
    // peer states

    private _peerConnections: { [id: string]: RTCPeerConnection | null } = {}
    private _peers_ids: { [id: string]: string | null } = {}
    private _peersInfo: { [id: string]: any | null } = {}
    private _politePeerStates: { [id: string]: boolean } = {}
    private _offferMakingStatePeers: { [id: string]: boolean } = {}

    // remote tracks
    private _remoteAudioStreams: { [id: string]: MediaStream | null } = {}
    private _remoteVideoStreams: { [id: string]: MediaStream | null } = {}
    private _remoteScreenShareStreams: { [id: string]: MediaStream | null } = {}
    private _rtpVideoSenders: { [id: string]: any } = {}
    private _rtpScreenShareSenders: { [id: string]: any } = {}
    private _rtpAudioSenders: { [id: string]: any } = {}


    // local controls
    private _isAudioMuted: boolean = true
    private _isVideoMuted: boolean = true
    private _isScreenShareMuted: boolean = true
    // soceket id and msg sending fn
    private _serverFn: Function
    private _my_connid: string = ''

    // callback functions array

    private _onLocalVideoStream: Function[] = []
    private _onLocalAudioStream: Function[] = []
    private _onPeerStateChanged: PeerStateChangedHandler[] = []
    private _onError: Function[] = []


    constructor(my_connid: string, iceConfiguration: RTCConfiguration, serverFn: Function) {
        this._my_connid = my_connid
        this._serverFn = serverFn
        this._iceConfiguration = iceConfiguration
    }

    // connections management
    async createConnection(connid: string, politePeerState: boolean, extraInfo: any | null = null) {
        if (this._iceConfiguration) {
            let connection = new RTCPeerConnection(this._iceConfiguration)

            connection.onicecandidate = (event) => {
                if (event.candidate) {
                    this._serverFn(JSON.stringify({ 'iceCandidate': event.candidate }), connid);
                }
            }

            connection.onicecandidateerror = (event) => {
                console.log(connid + ' onicecandidateerror', event);
                this._emitError("Failed to Gather ICE Candidate")
            }

            connection.onicegatheringstatechange = (event) => {
                console.log(connid + ' onicegatheringstatechange', event);
            }

            connection.oniceconnectionstatechange = () => {
                console.log(connid + ' peer ice connection state: ', connection.iceConnectionState);
                if (connection.iceConnectionState === "failed") {
                    connection.restartIce();
                }
            }

            connection.onnegotiationneeded = async (event) => {
                console.log(connid + ' onnegotiationneeded', event);
                await this._createOffer(connid);
            }

            connection.onconnectionstatechange = (event: any) => {
                console.log(connid + ' onconnectionstatechange', event?.currentTarget?.connectionState)
                if (event.currentTarget.connectionState === "connected") {
                    console.log(connid + ' connected')
                }
                if (event.currentTarget.connectionState === "disconnected") {
                    console.log(connid + ' disconnected');
                }
            }

            connection.ontrack = (event) => {
                console.log(connid + ' ontrack', event)
                if (!this._remoteVideoStreams[connid]) {
                    this._remoteVideoStreams[connid] = new MediaStream();
                }

                if (!this._remoteAudioStreams[connid]) {
                    this._remoteAudioStreams[connid] = new MediaStream();
                }

                if (event.track.kind == 'video') {
                    this._remoteVideoStreams[connid].getVideoTracks().forEach(t => this._remoteVideoStreams[connid]?.removeTrack(t));
                    this._remoteVideoStreams[connid].addTrack(event.track);
                    // this._remoteVideoStreams[connid].getTracks().forEach(t => console.log(t));

                    this._updatePeerState();

                }
                if (event.track.kind == 'audio') {
                    this._remoteAudioStreams[connid].getAudioTracks().forEach(t => this._remoteAudioStreams[connid]?.removeTrack(t));
                    this._remoteAudioStreams[connid].addTrack(event.track);
                    // this._remoteAudioStreams[connid].getTracks().forEach(t => console.log(t));

                    this._updatePeerState();
                }




            }
            this._peers_ids[connid] = connid;
            this._peerConnections[connid] = connection;
            this._politePeerStates[connid] = politePeerState;

            if (extraInfo) {
                this._peersInfo[connid] = extraInfo;
            }
            this._updatePeerState();
        }


    }

    async _createOffer(connid: string) {
        try {
            let connection = this._peerConnections[connid];
            if (connection != null) {
                this._offferMakingStatePeers[connid] = true;
                console.log(connid + ' creating offer: connenction.signalingState:' + connection?.signalingState);
                let offer = await connection?.createOffer();
                await connection?.setLocalDescription(offer);
                this._serverFn(JSON.stringify({ 'offer': connection?.localDescription }), connid);
            }
        }
        catch (err) {

            console.log(err);
            this._emitError(err);
        }
        finally {
            this._offferMakingStatePeers[connid] = false;
        }
    }

    async onSocketMessage(message: any, from_connid: string, extraInfo: any | null = null) {

        console.log(from_connid + ' onSocketMessage', message);
        let msg = JSON.parse(message);
        if (msg.iceCandidate) {
            if (!this._peerConnections[from_connid]) {
                console.log('peer ' + from_connid + ' not found , creating connection for ice candidate');
                await this.createConnection(from_connid, false, extraInfo);
            }
            try {
                await this._peerConnections[from_connid]?.addIceCandidate(msg.iceCandidate);
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
                await this.createConnection(from_connid, false, extraInfo);
            }
            try {
                if (this._peerConnections[from_connid]) {
                    const offerCollision = (this._offferMakingStatePeers[from_connid] || this._peerConnections[from_connid]?.signalingState !== "stable");
                    if (offerCollision && !this._politePeerStates[from_connid]) {
                        console.log("ignoring Offer", from_connid);
                        return;
                    }

                    await this._peerConnections[from_connid].setRemoteDescription(new RTCSessionDescription(msg.offer));
                    let answer = await this._peerConnections[from_connid].createAnswer();
                    await this._peerConnections[from_connid].setLocalDescription();
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
                    await this._peerConnections[from_connid].setRemoteDescription(new RTCSessionDescription(msg.answer));
                }
            }
            catch (err) {
                console.log(err);
                this._emitError("falled to set remote description");
            }
        }
    }

    _isConnectionAlive(connenction: RTCPeerConnection) {
        if (connenction && connenction.connectionState == "connected" ||
            connenction.connectionState == "new" ||
            connenction.connectionState == "connecting"
        ) return true;
        else return false;
    }

    closeConnection(connid: string) {

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

    onPeerStateChange(fn: PeerStateChangedHandler) {
        this._onPeerStateChanged.push(fn);
    }

    _updatePeerState() {
        let peerProperties: {
            socketId: string,
            info: any
            isAudioOn: boolean,
            isVideoOn: boolean,
            isScreenShareOn: boolean
            audioStream: MediaStream | null,
            videoStream: MediaStream | null,
            screenShareStream: MediaStream | null
            isPolite: boolean


        }[] = []
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
                })
            }
        }

        this._onPeerStateChanged.forEach(fn => fn(peerProperties));
    }

    _AlterAudioVideoSenders(track: MediaStreamTrack, rtpSenders: any) {
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

    _RemoveAudioVideoSenders(rtpSenders: any) {
        for (let conId in this._peers_ids) {
            if (this._peerConnections[conId] && this._isConnectionAlive(this._peerConnections[conId])) {
                if (rtpSenders[conId] && rtpSenders[conId].track) {
                    this._peerConnections[conId].removeTrack(rtpSenders[conId]);
                    rtpSenders[conId] = null;
                }
            }
        }
    }

    _ClearCameraVideoStreams(_rtpVideoSenders: any) {
        if (this._videoTrack) {
            this._videoTrack.stop();
            this._videoTrack = null;
            this._RemoveAudioVideoSenders(_rtpVideoSenders);
        }
    }

    _ClearScreenVideoStreams(_rtpScreenSenders: any) {
        if (this._screenShareTrack) {
            this._screenShareTrack.stop();
            this._screenShareTrack = null;
            this._RemoveAudioVideoSenders(_rtpScreenSenders);
        }
    }


    async startCamera(cameraConfig = {
        video: {
            width: 640,
            height: 480
        },
        audio: false
    }) {
        try {
            let videoStream = await navigator.mediaDevices.getUserMedia(cameraConfig);
            this._ClearCameraVideoStreams(this._rtpVideoSenders);
            if(videoStream && videoStream.getVideoTracks().length > 0){ 
                this._videoTrack = videoStream.getVideoTracks()[0];
                this._emitCameraVideoState(true);
                this._AlterAudioVideoSenders(this._videoTrack, this._rtpVideoSenders);
            }
            this._isVideoMuted = false
        }
        catch (e) {
            console.log(e);
            this._emitError("Failed to start camera");
        }
    }

    _emitCameraVideoState(state: boolean) {
        this._onCameraVideoStateChange.forEach(fn => fn(state,(this._videoTrack && new MediaStream([this._videoTrack]))));
    }

    _emitScreenShareState(state: boolean) {
        this._onScreenShareStateChange.forEach(fn => fn(state,(this._screenShareTrack  && new MediaStream([this._screenShareTrack]))));
    }

    _emitAudioState(state: boolean) {
        this._onAudioStateChange.forEach(fn => fn(state,(this._audioTrack && new MediaStream([this._audioTrack]))));
    }

    stopCamera() {
        this._ClearCameraVideoStreams(this._rtpVideoSenders);
        this._emitCameraVideoState(false);
        this._isVideoMuted = true
    }

   async toggleCamera() {
     if(this._isVideoMuted) await this.startCamera(); else this.stopCamera();
    }


    async startScreenShare(screenConfig = {
        video: {
            width: 640,
            height: 480
        },
        audio: false
    }) {
        try {
            let screenStream = await navigator.mediaDevices.getDisplayMedia(screenConfig);
            screenStream.oninactive = (e:any) => {
                this._ClearScreenVideoStreams(this._rtpScreenShareSenders);
                this._emitScreenShareState(false);
            }
            this._ClearScreenVideoStreams(this._rtpScreenShareSenders);
            if(screenStream && screenStream.getVideoTracks().length > 0){ 
                this._screenShareTrack = screenStream.getVideoTracks()[0];
                this._emitScreenShareState(true);
                this._AlterAudioVideoSenders(this._screenShareTrack, this._rtpScreenShareSenders);
            }
            this._isScreenShareMuted = false
        }
        catch (e) {
            console.log(e);
            this._emitError("Failed to start screen share");
        }
    }

    stopScreenShare() {
        this._ClearScreenVideoStreams(this._rtpScreenShareSenders);
        this._emitScreenShareState(false);
        this._isScreenShareMuted = true
    }



    async startAudio() {
        if (!this._audioTrack) {
            try {
                let audioStream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true
                })
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
    }

    async stopAudio() {
        if (this._audioTrack) {
            this._audioTrack.enabled = false;
            this._isAudioMuted = true;
            this._RemoveAudioVideoSenders(this._rtpAudioSenders);
            this._emitAudioState(false)
        }
    }
    async toggleAudio() {
        if (this._isAudioMuted) await this.startAudio();
        else await this.stopAudio();
    }




    // callback handlers
    onError(fn: Function) {
        this._onError.push(fn)
    }
    _emitError(error: any) {
        this._onError.forEach(fn => fn(error))
    }





}