// https://www.webrtc-experiment.com:12034/

var rtcMultiConnection = new RTCMultiConnection();

rtcMultiConnection.session = { data: true };

/*
// http://www.rtcmulticonnection.org/docs/fakeDataChannels/
rtcMultiConnection.fakeDataChannels = true;
if(rtcMultiConnection.UA.Firefox) {
rtcMultiConnection.session.data = true;
}
*/

rtcMultiConnection.autoTranslateText = false;

var colors = ['rgb(235, 235, 235)', 'rgb(255, 255, 158)', 'rgb(224, 255, 250)', 'rgb(255, 239, 224)', 'rgb(249, 223, 250)', 'rgb(235, 138, 165)', 'rgb(151, 147, 148)'];

rtcMultiConnection.onopen = function(e) {
    getElement('#allow-webcam').disabled = false;
    getElement('#allow-mic').disabled = false;
    getElement('#share-files').disabled = false;
    getElement('#allow-screen').disabled = false;

    addNewMessage({
        header: e.extra.username,
        message: 'Data connection is opened between you and ' + e.extra.username + '.',
        userinfo: getUserinfo(rtcMultiConnection.blobURLs[rtcMultiConnection.userid], 'images/info.png')
    });

    numbersOfUsers.innerHTML = parseInt(numbersOfUsers.innerHTML) + 1;
    if (rtcMultiConnection.peers[e.userid]) {
        rtcMultiConnection.peers[e.userid].color = colors[parseInt(numbersOfUsers.innerHTML)];
    }
};

rtcMultiConnection.onmessage = function(e) {
    addNewMessage({
        header: e.extra.username,
        message: 'Text message from ' + e.extra.username + ':<br /><br />' + (rtcMultiConnection.autoTranslateText ? linkify(e.data) + ' ( ' + linkify(e.original) + ' )' : linkify(e.data)),
        userinfo: getUserinfo(rtcMultiConnection.blobURLs[e.userid], 'images/chat-message.png'),
        callback: function(div) {
            if (rtcMultiConnection.peers[e.userid]) {
                div.querySelector('.user-info').style.background = rtcMultiConnection.peers[e.userid].color;
            }
        }
    });
    document.title = e.data;
};

rtcMultiConnection.init = function() {
    var channels = { };

    socket.on('message', function(data) {
        if (data.sender == rtcMultiConnection.userid) return;

        if (channels[data.channel] && channels[data.channel].onmessage) {
            channels[data.channel].onmessage(data.message);
        }
    });

    // overriding "openSignalingChannel" method
    rtcMultiConnection.openSignalingChannel = function(config) {
        var channel = config.channel || this.channel;
        channels[channel] = config;

        if (config.onopen) setTimeout(config.onopen, 1000);
        return {
            send: function(message) {
                socket.emit('message', {
                    sender: rtcMultiConnection.userid,
                    channel: channel,
                    message: message
                });
            },
            channel: channel
        };
    };
};

var sessions = { };
rtcMultiConnection.onNewSession = function(session) {
    if (sessions[session.sessionid]) return;
    sessions[session.sessionid] = session;

    session.join();

    addNewMessage({
        header: session.extra.username,
        message: 'Making handshake with room owner....!',
        userinfo: '<img src="images/action-needed.png">'
    });
};

rtcMultiConnection.onRequest = function(request) {
    rtcMultiConnection.accept(request);
    addNewMessage({
        header: 'New Participant',
        message: 'A participant found. Accepting request of ' + request.extra.username + ' ( ' + request.userid + ' )...',
        userinfo: '<img src="images/action-needed.png">'
    });
};

rtcMultiConnection.onCustomMessage = function(message) {
    if (message.hasCamera) {
        addNewMessage({
            header: message.extra.username,
            message: message.extra.username + ' enabled webcam. <button id="preview">Preview</button> ---- <button id="share-your-cam">Share Your Webcam</button>',
            userinfo: '<img src="images/action-needed.png">',
            callback: function(div) {
                div.querySelector('#preview').onclick = function() {
                    this.disabled = true;
                    rtcMultiConnection.sendMessage({
                        renegotiate: true
                    });
                };

                div.querySelector('#share-your-cam').onclick = function() {
                    this.disabled = true;
                    rtcMultiConnection.peers[message.userid].addStream({
                        audio: true,
                        video: true,
                        oneway: true
                    });
                };
            }
        });
    }

    if (message.hasMic) {
        addNewMessage({
            header: message.extra.username,
            message: message.extra.username + ' enabled microphone. <button id="listen">Listen</button> ---- <button id="share-your-mic">Share Your Mic</button>',
            userinfo: '<img src="images/action-needed.png">',
            callback: function(div) {
                div.querySelector('#listen').onclick = function() {
                    this.disabled = true;
                    rtcMultiConnection.sendMessage({
                        renegotiate: true
                    });
                };

                div.querySelector('#share-your-mic').onclick = function() {
                    this.disabled = true;
                    rtcMultiConnection.peers[message.userid].addStream({
                        audio: true,
                        oneway: true
                    });
                };
            }
        });
    }

    if (message.renegotiate) {
        rtcMultiConnection.peers[message.userid].renegotiate(rtcMultiConnection.attachStreams[0]);
    }
};


rtcMultiConnection.blobURLs = { };
rtcMultiConnection.onstream = function(e) {
    if (e.stream.getVideoTracks().length) {
        rtcMultiConnection.blobURLs[e.userid] = e.blobURL;
        /*
        if( document.getElementById(e.userid) ) {
        document.getElementById(e.userid).muted = true;
        }
        */
        addNewMessage({
            header: e.extra.username,
            message: e.extra.username + ' enabled webcam.',
            userinfo: '<video id="' + e.userid + '" src="' + URL.createObjectURL(e.stream) + '" autoplay muted=true volume=0></vide>'
        });
    } else {
        addNewMessage({
            header: e.extra.username,
            message: e.extra.username + ' enabled microphone.',
            userinfo: '<audio src="' + URL.createObjectURL(e.stream) + '" controls muted=true volume=0></vide>'
        });
    }
    usersContainer.appendChild(e.mediaElement);
};

rtcMultiConnection.sendMessage = function(message) {
    message.userid = rtcMultiConnection.userid;
    message.extra = rtcMultiConnection.extra;
    rtcMultiConnection.sendCustomMessage(message);
};

rtcMultiConnection.onclose = rtcMultiConnection.onleave = function(event) {
    addNewMessage({
        header: event.extra.username,
        message: event.extra.username + ' left the room.',
        userinfo: getUserinfo(rtcMultiConnection.blobURLs[event.userid], 'images/info.png')
    });
};
