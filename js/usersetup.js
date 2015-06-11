var socket;
var IP = "http://students.gctaa.net:3000";
$(document).ready(function () {
    socket = io.connect(IP, {
        'forceNew': true
    });
    connectToServer();
    $("#submitNewUser").click(function () {
        var user = $("#userInput").val();
        var pass = $("#password").val();
        if (pass && user) {
            sendNewUserToServer(user, pass); // todo more requirements
        } else {
            alert("You need a username and a password!");
        }
    });
});

function sendNewUserToServer(username, password) {
    var id = storeKey();
    console.log("storeKey is " + id + " emitting");
    socket.emit('newuser', {
        'user': username,
        'pass': password,
        'id': id
    });
    socket.on('newuserconfirm', function (data) {
        var id = data.id;
        var user = data.user;
        var pass = data.pass;
        console.log('newuserconfirm ' + id + " " + user + " " + pass);
        if (id == localStorage.getItem("id")) {
            localStorage.setItem("username", user);
            localStorage.setItem("password", pass);
            console.log("Matched, it's you. Setting location...");
            window.location = 'index.html';
        }
    });
    socket.on('newusererror', function (data) {
        var id = data.id;
        var user = data.user;
        if (localStorage.getItem("id") == id) {
            console.log("Received an error with creating the new user: " + JSON.stringify(data));
            console.log("You can't create an account!");
        }
    });
}

function connectToServer() {
    socket.on('connect', function () {
        console.log("Successfully connected to server.");
    });
}

function storeKey() {
    if (!localStorage.getItem("id")) {
        var roomId = "";
        var alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        var max = alphabet.length;
        for (var i = 0; i < 10; i++) {
            var random = Math.floor(Math.random() * (max));
            roomId += alphabet.substring(random - 1, random);
        }
        console.log("RoomId is " + roomId);
        localStorage.setItem("id", roomId);
    }
    return localStorage.getItem("id");
}