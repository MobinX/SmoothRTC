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
(() => __awaiter(void 0, void 0, void 0, function* () {
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
            WrtcHelper.init(sendmsg, ably.auth.clientId, iceServers);
            isWrtcInit = true;
        }
        console.log('Connected to Ably!');
    }));
    const myid = ably.auth.clientId;
    console.log('myid: ', myid);
    const channel = ably.channels.get('quickstart');
    $('#meetingname').text(myid);
    $('#me h2').text(myid + '(Me)');
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
                        WrtcHelper.init(sendmsg, ably.auth.clientId, iceServers);
                        isWrtcInit = true;
                    }
                }
                console.log(message);
                yield WrtcHelper.ExecuteClientFn(message.data.data, message.clientId);
            }
        }
    }));
    channel.presence.subscribe('enter', function (member) {
        return __awaiter(this, void 0, void 0, function* () {
            if (member.clientId === myid) {
                return;
            }
            console.log("informAboutNewConnection", member);
            AddNewUser(member.clientId, member.clientId);
            WrtcHelper.createNewConnection(member.clientId);
        });
    });
    channel.presence.subscribe('leave', function (member) {
        return __awaiter(this, void 0, void 0, function* () {
            if (member.clientId === myid) {
                return;
            }
            $('#' + member.clientId).remove();
            WrtcHelper.closeExistingConnection(member.clientId);
        });
    });
    channel.presence.get(function (err, other_users) {
        console.log("userconnected", other_users);
        $('#divUsers .other').remove();
        if (other_users) {
            for (var i = 0; i < other_users.length; i++) {
                /*  AddNewUser(other_users[i].clientId, other_users[i].clientId);
                  WrtcHelper.createNewConnection(other_users[i].clientId,false);*/
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
