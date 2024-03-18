

import { Peer } from './index.js';
const response = await fetch("https://virsys.metered.live/api/v1/turn/credentials?apiKey=ca9f4e60bf446fc29401ccb1fa904d110708");
const iceServers = await response.json();
console.log(iceServers);
const ably = new Ably.Realtime({key:'YSXfdw.ksCpsA:Bf6jKYu4LPPpMfiFkSMJrZ4q4ArLDkuBf7bJCPxKQUo', clientId: Math.random().toString(36).substring(7)});
ably.connection.once('connected').then(() => {
  console.log('Connected to Ably!');
})
const localVideo  = document.getElementById('localVideo '); 
const remoteVideo = document.getElementById('remoteVideo'); 

const Peers = [];

console.log(ably)

// ==================================ably ========================
// get the channel to subscribe to
const channel = ably.channels.get('quickstart');
await channel.subscribe('greeting', (message) => {
  console.log('message received: ')
  console.log(message);
  if(Peers.length === 0) {
    return;
  }else{
    Peers.forEach(peer => {
      peer.onmessage(message.data);
    });
  }
});

 channel.presence.subscribe('enter', async function(member) {
  console.log('member entered: ', member.clientId);
  await createPeer(member.clientId, false);
});

 channel.presence.subscribe('leave', async function(member) {
  console.log('member left: ', member.clientId);
  await removePeer(member.clientId);
});
channel.presence.get(function(err, members) {
  console.log('There are ' + members.length + ' members on this channel');
  console.log(members);

});

// ==================================ably ========================



async function createPeer(id, isPolite) {
  const peer = new Peer({
    id:id,
    ice: { iceServers },
    isPolite: isPolite,
    onremotetrack: (event) => {
      console.log('remote track');
    },
    sendmsg: async (msg) => {
      await sendmsg(msg);
    }

  });
  Peers.push(peer);

  return peer;
}

async function removePeer(id) {
  const index = Peers.findIndex(peer => peer.id === id);
  if(index !== -1) {
    Peers.splice(index, 1);
  }
}

async function sendmsg(msg) {
  await channel.publish('greeting', msg);
}

await sendmsg({type: 'test', data: 'test'});

channel.presence.enter("mobin");
