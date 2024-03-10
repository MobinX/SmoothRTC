

import { Peer } from './index.js';
const response = await fetch("https://virsys.metered.live/api/v1/turn/credentials?apiKey=ca9f4e60bf446fc29401ccb1fa904d110708");
const iceServers = await response.json();
const ably = new Ably.Realtime.Promise('xVLyHw.ifW9uw:i_gvwVPehAHhh_C6oypPkjOYS-eS5XjBOqkNwe1ZeUI');
await ably.connection.once('connected');
console.log('Connected to Ably!');



const peer = new Peer({ id: 'test', onremotetrack: (e) => console.log(e), isPolite: true, onsocketmsg: (msg) => console.log(msg), sendmsg: (msg) => console.log(msg), ice: { iceServers: iceServers } });
peer.test();


// get the channel to subscribe to
const channel = ably.channels.get('quickstart');


/*
  Subscribe to a channel.
  The promise resolves when the channel is attached
  (and resolves synchronously if the channel is already attached).
*/
await channel.subscribe('greeting', (message) => {
  console.log('Received a greeting message in realtime: ' + message.data)
});


async function sendmsg(msg) {

await channel.publish('greeting',msg);

}

async function onsocketmsg(callback) {  
  await channel.subscribe('greeting', (message) => {
    callback(message.data);
  });
}