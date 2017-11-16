/*
Copyright 2015-2016 Carnegie Mellon University

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
window.URL = window.URL ||
    window.webkitURL ||
    window.msURL ||
    window.mozURL;

function btnStartOnclick(){
    var name = $("#addPersonTxt").val();
    if(document.getElementById("addPersonTxt").value=='')
    { alert("Please input your name!"); return; }

    console.log("in btnStartOnclick");
    sendMessage("TRAINSTART_REQ", name);
}

function btnFinishOnclick(){
    console.log("in btnFinishOnclick");
    sendMessage("TRAINFINISH_REQ", "");
}

function btnDeleteOnclick(){
    var name = $("#addPersonTxt").val();
    if(document.getElementById("addPersonTxt").value=='')
    { alert("Please input your name!"); return; }

    console.log("in btnDeleteOnclick");
    sendMessage("DELETENAME_REQ", name);
}

function createCacheConvas(){
    for (var j = 0; j < bufNum; j ++) {
        var cvs = document.createElement("canvas");
        var ctx = cvs.getContext('2d');  
        cvs.width = video.width;
        cvs.height = video.height;
        bufferConvas.push(cvs);
        bufferCtx.push(ctx);
    }
    currentCtx = 0;
}

function drawFrame(){
    bufferCtx[currentCtx].drawImage(video, 0, 0);
    currentCtx = (currentCtx + 1 == bufNum) ? 0 : currentCtx + 1;
    outputCtx.drawImage(bufferConvas[currentCtx], 0, 0)

    tmp = recgRet;
    //Drow people names
    for (var key in tmp) {
        var rect = tmp[key]["pos"];
        var name = tmp[key]["name"];
        outputCtx.lineWidth=2;
        outputCtx.strokeStyle="red";
        outputCtx.beginPath();
        outputCtx.rect(rect[0], rect[1], rect[2], rect[3]);
        outputCtx.closePath();
        outputCtx.font="25px Arial";
        outputCtx.fillText(name, rect[0], rect[1]);
        outputCtx.stroke();
    }
}

function sendFrame() {
    if (socket == null || socket.readyState != socket.OPEN ||
        !vidReady) {
        return;
    }
    sndIdx = (currentCtx == 0) ? (bufNum - 1) : currentCtx - 1;
    var dataURL = bufferConvas[sndIdx].toDataURL('image/jpeg', 0.6)

    var msg = {
        'type': 'RECGFRAME_REQ',
        'dataURL': dataURL,
    };
    socket.send(JSON.stringify(msg));
}
var needSend = 0;
function processFrameLoop() {
   drawFrame();
   if(needSend ++ == 4) {
       sendFrame();
       needSend = 0;
   }
   setTimeout("processFrameLoop()", 30);
}


function redrawPeople(peopleNames) {
   document.getElementById("identity").value=peopleNames;
}

function sendMessage(type, msg) {
    var msg = {
               'type': type,
               'msg' : msg };
    socket.send(JSON.stringify(msg));
}

function createSocket(address) {

    socket = new WebSocket(address);
    socket.binaryType = "arraybuffer";
    socket.onopen = function() {
        console.log("On open");
        socket.send(JSON.stringify({'type': 'CONNECT_REQ'}));
        $("#serverStatus").html("Connected.");
        $("#trainingStatus").html("Recognizing.");
    }
    socket.onmessage = function(e) {
        console.log(e);
        j = JSON.parse(e.data)
        if (j.type == "CONNECT_RESP") {
            sendMessage("LOADNAME_REQ", "");
//        } else if (j.type == "INITCAMERA") {
            initCamera();
            createCacheConvas();
            processFrameLoop();
        } else if (j.type == "LOADNAME_RESP") {
            redrawPeople(j['msg']);
        } else if (j.type == "RECGFRAME_RESP") {
            recgRet = j['msg'];
        } else if (j.type == "TRAINSTART_RESP") {
            $("#trainingStatus").html("Training.");
        } else if (j.type == "TRAINFINISH_RESP") {
            redrawPeople(j['msg']);
            $("#trainingStatus").html("Recognizing.");
        } else if (j.type == "ERROR_MSG") {
            alert(j['msg']);
        } else if (j.type == "TRAINPROCESS") {
        } else {
            console.log("Unrecognized message type: " + j.type);
        }
    }
    socket.onerror = function(e) {
        console.log("Error creating WebSocket connection to " + address);
        console.log(e);
    }
    socket.onclose = function(e) {
        if (e.target == socket) {
            $("#serverStatus").html("Disconnected.");
        }
    }
}


function initCamera() {
     onErr = function(error) {
         alert(error);
     };

    var vConstraints = { video: true};

     // Put video listeners into place
     if(navigator.getUserMedia) { // Standard
         navigator.getUserMedia(vConstraints, function(stream) {
             video.src = window.URL.createObjectURL(stream) || stream;
             video.play();
             vidReady = true;
         }, onErr);
     } else if(navigator.webkitGetUserMedia) { // WebKit-prefixed
         navigator.webkitGetUserMedia(vConstraints, function(stream){
             video.src = window.URL.createObjectURL(stream) || stream;
             video.play();
             vidReady = true;
         }, onErr);
     }
     else if(navigator.mozGetUserMedia) { // Firefox-prefixed
         navigator.mozGetUserMedia(vConstraints, function(stream){
             video.srcObject = stream;
             video.play();
             vidReady = true;
         }, onErr);
     }
}
