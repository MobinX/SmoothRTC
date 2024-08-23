export class WebrtcBase {
    private _iceConfiguration: RTCConfiguration | null = null
    // local tracks
    private _audioTrack: MediaStreamTrack | null = null
    private _videoTrack: MediaStreamTrack | null = null
    private _screenShareTrack: MediaStreamTrack | null = null
    // peer states

    private _peerConnections: { [id: string]: RTCPeerConnection } = {}
    private _peers_ids: { [id: string]: string } = {}
    private _peersInfo: { [id: string]: any } = {}
    private _politePeerStates: { [id: string]: boolean } = {}
    private _offferMakingStatePeers: { [id: string]: boolean } = {}

    // remote tracks
    private _remoteAudioStreams: { [id: string]: MediaStream } = {}
    private _remoteVideoStreams: { [id: string]: MediaStream } = {}
    private _remoteScreenShareStreams: { [id: string]: any } = {}
    private _rtpVideoSenders: { [id: string]: any } = {}
    private _rtpAudioSenders: { [id: string]: any } = {}


    // local controls
    private _isAudioMuted: boolean = false
    private _isVideoMuted: boolean = false
    private _isScreenShareMuted: boolean = false
    // soceket id and msg sending fn
    private _serverFn: Function
    private _my_connid: string = ''

    // callback functions array
    private _onLocalVideoStream: Function[] = []
    private _onLocalAudioStream: Function[] = []
    private _PeerStateChanged: Function[] = []
    private _onError: Function[] = []


    constructor(my_connid: string, iceConfiguration: RTCConfiguration, serverFn: Function) {
        this._my_connid = my_connid
        this._serverFn = serverFn
        this._iceConfiguration = iceConfiguration
    }

    // connections management

    async createConnection(connid: string, politePeerState:boolean, extraInfo: any | null = null) {
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


                

            }
            this._peers_ids[connid] = connid;
            this._peerConnections[connid] = connection;
            this._politePeerStates[connid] = politePeerState;

            if(extraInfo){
                this._peersInfo[connid] = extraInfo;
            }

            _updatePeerState();
        }
    }









    // callback handlers
    onError(fn: Function) {
        this._onError.push(fn)
    }
    _emitError(error: any) {
        this._onError.forEach(fn => fn(error))
    }





}