

import { Peer } from './index.js';
import { openVedio, stopCamera,openMicrophone } from './media.js';
const response = await fetch("https://virsys.metered.live/api/v1/turn/credentials?apiKey=ca9f4e60bf446fc29401ccb1fa904d110708");
const response2 = await fetch('https://global.xirsys.net/_turn/sigflow', {
  method: 'PUT',
  headers: {
    'Authorization': 'Basic ' + btoa('mobin:e2d2ad94-0e2b-11eb-85a4-0242ac150006'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ })
});

const data = await response2.json();
console.log('response: ', data);
// const iceServers = await response.json();
const iceServers = data.v.iceServers;

console.log(iceServers);
const ably = new Ably.Realtime({ key: 'YSXfdw.ksCpsA:Bf6jKYu4LPPpMfiFkSMJrZ4q4ArLDkuBf7bJCPxKQUo', clientId: Math.random().toString(36).substring(7) });
ably.connection.once('connected').then(() => {
  console.log('Connected to Ably!');
})
const localVideo = document.getElementById('localVideo');
const createRemoteVideobyId = (id) => {
  const remoteVideo = document.createElement('video');
  remoteVideo.id = id;
  remoteVideo.autoplay = true;
  remoteVideo.playsInline = true;
  document.body.appendChild(remoteVideo);
  return remoteVideo;
}
const removeRemoteVideobyId = (id) => {
  const remoteVideo = document.getElementById(id);
  document.body.removeChild(remoteVideo);
}

window.stream = await openVedio();
// window.stream = (await openMicrophone(window.stream))
console.log('stream: ', window.stream);
localVideo.srcObject = window.stream;

// setTimeout(async () => { stopCamera(window.stream); }, 5000);
// setTimeout(async () => {  window.stream = await openVedio(window.stream);
// localVideo.srcObject = window.stream;
// }, 10000);


const Peers = [];

const myid = ably.auth.clientId;
console.log('myid: ', myid);
// ==================================ably ========================
// get the channel to subscribe to
const channel = ably.channels.get('quickstart');

await channel.subscribe('greeting', async (message) => {

  // clientid ==  sender from
  // id == receiver (to)
  if (message.clientId === myid) {
    //checking i am not worikng on my own msg
    return;
  } else {

    if (message.data.id === myid) {
      //checking if the msg is for me
      console.log('message received from: '+ message.clientId);
      console.log(message);
      if (Peers.length === 0) {
        //every peer is created based on the id of his massage. so peer.id contain remote peer id 
        //when a peer send msg it include the id it got from constractor in the msg.
        // so massage.clientId is the id of the peer that send the msg. SENDER
        //massage.data.id is the id of the peer whom he sends msg to.
        createPeer(message.clientId, true,message.data);
     
        return;
      } else {
        let senderId = message.clientId
        console.log('sender id: ', senderId);
        const peerindex = Peers.findIndex(peer => peer.id === senderId);
        if (peerindex !== -1) {
          console.log(senderId + " is in index: " + peerindex + "sending him the msg");
          await Peers[peerindex].onmessage(message.data);
          return;
        } else {
          console.log(senderId + " is not in index: " + peerindex + "creating him with true polite peer");
          createPeer(senderId, true,message.data);
          return;
        }
        // Peers.forEach(async peer => {

        // if(peer.id === senderId && message.data.id === myid){ //if the sender is the peer that send the msg and the msg is for me
        //     await peer.onmessage(message.data);
        //     return;
        // }
        // });
      }

    }

  }

});

channel.presence.subscribe('enter', async function (member) {
  if (member.clientId === myid) {
    return;
  }
  console.log('member entered: creating unpolite peer', member.clientId);
  await createPeer(member.clientId, false);
});

channel.presence.subscribe('leave', async function (member) {
  if (member.clientId === myid) {
    return;
  }
  console.log('member left: ', member.clientId);
  await removePeer(member.clientId);
});
channel.presence.get(function (err, members) {
  console.log('There are ' + members.length + ' members on peer channel');
  console.log(members);

});

// ==================================ably ========================



 function createPeer(id, isPolite,initailRemoteMsg = null) {
  console.log('Peers1: ', Peers);

  const remoteVideo = createRemoteVideobyId(id);
  const peer = new Peer({
    id: id,
    ice: { iceServers },
    isPolite: isPolite,
    onremotetrack: ({ track, streams }) => {
      console.log(id + ' remote track received: ', track, streams);
      console.log(id + " is track enabled: ", track.enabled);
      console.log(id + " is track muted: ", track.muted);
      console.log(id + " is track readyState: ", track.readyState);
      console.log(id + " is track kind: ", track.kind);
      console.log(id + " is stram active: ", streams[0].active);
      track.onunmute = () => {
        console.log(id + ' track unmuted');
        console.log(id + " is track muted: ", track.muted);
        let remoteVi = document.getElementById(id);
        remoteVi.srcObject = streams[0];
        // remoteVideo.srcObject = streams[0];
       
        console.log(id + " is track muted: ", track.muted);
        console.log(id + " remote video srcObject: ", remoteVideo.srcObject);
      }
    //   track.onmute = async () => {
    //     try {
    //       console.log('track muted, renegotiating');
    //         console.log("Peer onnegotiationneeded" , peer.id)
    //         peer.makingOffer = true;
    //         console.log('making offer')
    //         await peer.pc.setLocalDescription();
    //         await peer.sendmsg({ id: peer.id, type: "session_desc", data: peer.pc.localDescription });
    //     } catch (err) {
    //         console.error(err);
    //     } finally {
    //         peer.makingOffer = false;
    //     }
    // }

    },
    sendmsg: async (msg) => {
      await sendmsg(msg);
    }

  });
  peer.setSelfStream(window.stream);
  if(initailRemoteMsg !== null) peer.onmessage(initailRemoteMsg);
  Peers.push(peer);

  console.log('peer created: ', peer.id)
  console.log('Peers: ', Peers);

  return peer;
}

async function removePeer(id) {
  removeRemoteVideobyId(id);
  const index = Peers.findIndex(peer => peer.id === id);
  if (index !== -1) {
    Peers.splice(index, 1);
  }
  console.log('peer removed: ', id);
  console.log('Peers: ', Peers);
}

async function sendmsg(msg) {
  await channel.publish('greeting', msg);
  console.log('message sent: ', msg);
}


channel.presence.enter("mobin");
