

import { Peer } from './index.js';
import { openVedio, stopCamera } from './media.js';
const response = await fetch("https://virsys.metered.live/api/v1/turn/credentials?apiKey=ca9f4e60bf446fc29401ccb1fa904d110708");
const iceServers = await response.json();
console.log(iceServers);
const ably = new Ably.Realtime({ key: 'YSXfdw.ksCpsA:Bf6jKYu4LPPpMfiFkSMJrZ4q4ArLDkuBf7bJCPxKQUo', clientId: Math.random().toString(36).substring(7) });
ably.connection.once('connected').then(() => {
  console.log('Connected to Ably!');
})
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

window.stream = await openVedio();
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
  if (message.clientId === myid) {
    return;
  } else {
    console.log('message received: ')
    console.log(message);
    if (Peers.length === 0) {
      await createPeer(message.clientId, true);
      Peers.forEach(async peer => {
        await peer.onmessage(message.data);
      });
      return;
    } else {
      Peers.forEach(async peer => {
        await peer.onmessage(message.data);
      });
    }
  }

});

channel.presence.subscribe('enter', async function (member) {
  if (member.clientId === myid) {
    return;
  }
  console.log('member entered: ', member.clientId);
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
  console.log('There are ' + members.length + ' members on this channel');
  console.log(members);

});

// ==================================ably ========================



async function createPeer(id, isPolite) {
  const peer = new Peer({
    id: id,
    ice: { iceServers },
    isPolite: isPolite,
    onremotetrack: ({ track, streams }) => {
      console.log('remote track received: ', track, streams);
      console.log("is track enabled: ", track.enabled);
      console.log("is track muted: ", track.muted);
      console.log("is track readyState: ", track.readyState);
      console.log("is track kind: ", track.kind);
      console.log("is stram active: ", streams[0].active);
      track.onunmute = () => {
        console.log('track unmuted'); 
      console.log("is track muted: ", track.muted);
       
        remoteVideo.srcObject = streams[0];
        remoteVideo.play();
        console.log("is track muted: ", track.muted);
        console.log("remote video srcObject: ", remoteVideo.srcObject);
      }
      track.onmute = () => {
        console.log('track muted');
      }
    },
    sendmsg: async (msg) => {
      await sendmsg(msg);
    }

  });
  peer.setSelfStream(window.stream);
  Peers.push(peer);

  console.log('peer created: ', peer.id)
  console.log('Peers: ', Peers);

  return peer;
}

async function removePeer(id) {
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
