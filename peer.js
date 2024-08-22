/**
 * Class representing a Peer.
 * Basically the peer who send offer with be considered as polite peer.
 * who will receive the offer will be considered as impolite peer.
 * 1.So whenever a peer adds in signaling socket , the other notified peer will send offer and 
 * attribute those peers as impolite peers in their local peer list (meaning self peer with behave impolite with those peers)
 * 2.on the other hand the peer who will receive any offer will consider the offerer as polite peer (meaning self peer with behave polite with those peers)
 */
export default class Peer {
    /**
     * Create a Peer.
     * @param {Object} options - The options for the Peer.
     * @param {string} options.id - The ID of the Peer.
     * @param {Function} options.onsocketmsg - The callback function to handle socket messages.
     * @param {Function} options.sendmsg - The function to send messages.
     * @param {Object} options.ice - The ICE configuration for the PeerConnection.
     * @param {boolean} options.isPolite - Indicates if the Peer is polite.
     * @param {Function} options.onremotetrack - The callback function to handle remote tracks.
     */
    constructor({ id, sendmsg, ice, isPolite, onremotetrack }) {

        this.id = id;
        this.sendmsg = sendmsg;
        this.ice = ice;
        this.pc = new RTCPeerConnection(this.ice);

        if (isPolite) {
            console.log(this.id +  ' creating data channel')
            this.dataChannel = this.pc.createDataChannel("dc");
            this.dataChannel.onerror = (error) => {
                console.log(this.id +  ' data channel error: ', error);
            }
            this.dataChannel.onopen = (event) => {
                console.log(this.id +  ' data channel opened'); this.dataChannel.send("iddd");
            }
            this.dataChannel.onmessage = (event) => {
                console.log(this.id +  ' data channel message received: ', event.data);
            }
        }

        this.pc.ondatachannel = (event) => {
            console.log(this.id +  ' peer ondatachannel', event);
            this.dataChannel = event.channel;
            this.dataChannel.onopen = (event) => {
                console.log(this.id +  ' data channel opened'); this.dataChannel.send("idddx");
            }
            this.dataChannel.onmessage = (event) => {
                console.log(this.id +  ' data channel message received: ', event.data);
            }
        }

        this.makingOffer = false;
        this.pc.onnegotiationneeded = async () => {
            try {
                console.log(this.id +  " Peer onnegotiationneeded" , this.id)
                this.makingOffer = true;
                console.log(this.id +  ' making offer this peer')
                await this.pc.setLocalDescription();
                await this.sendmsg({ id: this.id, type: "session_desc", data: this.pc.localDescription });
            } catch (err) {
                console.error(this.id +  ' offer making error',err);
            } finally {
                this.makingOffer = false;
            }
        }

        this.pc.onicecandidate = async (candidate) => {
            try {
                if (candidate) {
                    console.log(this.id +  ' ice candidate sending by me', candidate);
                    await this.sendmsg({ id: this.id, type: "ice", data: candidate });
                }
            }
            catch (err) {
                console.error(err);
            }

        }
        this.ignoreOffer = false;
        this.polite = isPolite;
        this.pc.ontrack = ({ track, streams }) => {
            console.log(this.id +  ' peer remote track received: ', track, streams);
            onremotetrack({ track, streams })
        };
        this.pc.oniceconnectionstatechange = () => {
            console.log(this.id +  ' peer ice connection state: ', this.pc.iceConnectionState);
            if (this.pc.iceConnectionState === "failed") {
                this.pc.restartIce();
            }
        }



    }

    sendDataChnMsg = (msg) => {
        this.dataChannel.send(msg);
    }

    test() {
        console.log('test');
    }

    /**
     * Sets the self stream for the peer connection.
     * @param {MediaStream} stream - The media stream to be added.
     */
    setSelfStream = (stream) => {

        for (const track of stream.getTracks()) {
            this.pc.addTrack(track, stream);
        }
    }

    /**
     * Handle incoming socket messages.
     * @param {Object} data - The data object containing description and candidate.
     */
    onmessage = async ({id, type, data }) => {
        console.log(id + " peer onmessage", type, data, this.id)
       
        try {
            if (type === "session_desc" || type === "offer" || type === "answer") {
                const description = data;
                const offerCollision =
                    description.type === "offer" &&
                    (this.makingOffer || this.pc.signalingState !== "stable");

                this.ignoreOffer = !this.polite && offerCollision;
                if (this.ignoreOffer) {
                    console.log("ignoring offer for ",id);
                    return;
                }
                console.log("setting remote description for ", id);
                await this.pc.setRemoteDescription(description);

                if (description.type === "offer") {
                    console.log("offer received from ," , id);
                    await this.pc.setLocalDescription();
                    await this.sendmsg({ id: this.id, type: "session_desc", data: this.pc.localDescription });
                    console.log("sending answer to ", this.id);
                }
            } else if (type === "ice") {
                try {
                    await this.pc.addIceCandidate(data/*aka candidate*/);
                } catch (err) {
                    if (!this.ignoreOffer) {
                        throw err;
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * Handle negotiation needed event.
     */
    onnegotiationneeded = async () => {
        try {
            this.makingOffer = true;
            await this.pc.setLocalDescription();
            await this.sendmsg({ id: this.id, type: "session_desc", data: pc.localDescription });
        } catch (err) {
            console.error(err);
        } finally {
            this.makingOffer = false;
        }
    }


    /**
     * Handle ice candidate event.
     * @param {Object} event - The event object containing the candidate.
     */


    // other methods and properties here

}