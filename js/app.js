$(document).ready(function () {
    var id = storeKey();
    var IP = "http://students.gctaa.net:3000";
    var options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    };

    var socket = io.connect(IP, {
        'forceNew': true
    });
    $("#currentStatus").text("Connecting to server...");
    connectToServer();
    if (!localStorage.getItem("username")) {
        window.location = "usersetup.html"
    }
    $("#yourId").text("Your unique ID is: " + id);
    $("#sendInfo").click(function () {
        navigator.geolocation.getCurrentPosition(success, error, options);
    });
    $("#addFriend").click(function () {
        newId = $("#friendCode").val();
        socket.emit('friendrequest', {
            'username': localStorage.getItem("username"),
            'id': storeKey(),
            'to': newId
        });
    });

    function success(pos) {
        var crd = pos.coords;
        sendCoordinates(crd.latitude, crd.longitude, crd.accuracy, id);
    };

    function error(err) {
        console.warn('ERROR(' + err.code + '): ' + err.message);
    };


    function toRad(deg) {
        return deg * (Math.PI / 180.0);
    }

    function toDeg(rad) {
        return rad * (180.0 / Math.PI);
    }

    function getMiles(lat1, lon1, lat2, lon2) {
        var R = 6371; // Radius of the earth in km
        var dLat = toRad(lat2 - lat1); // toRad below 
        var dLon = toRad(lon2 - lon1);
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d * 0.621371;
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

    function requestUserList() {
        socket.emit('getuserlist', {
            'id': id
        });
    }

    function connectToServer() {
        socket.on('connect', function () {
            $("#currentStatus").text("Connected. Checking username...");
            console.log("Successfully connected to server.");
            console.log("Username is " + localStorage.getItem("username"));
            if (localStorage.getItem("username")) {
                console.log('it exists');
                socket.emit('reconnection', {
                    'user': localStorage.getItem("username"),
                    'pass': localStorage.getItem("password"),
                    'id': id
                });
                $("#currentStatus").text("Awaiting for response from server...");
            }
        });
        socket.on('userlogin success', function (data) {
            if (data.id == storeKey()) {
                console.log("Success, and it was this client");
            }
            $("#currentStatus").text("Authenticated. Logging in...");
            $("#currentStatus").text("Done logging in.");
            $("#yourUsername").text(localStorage.getItem("username"));
            $("#yourId").show();
            $("#friendsList").show();
            $("#yourUsername").show();
            $("#addFriend").show();
            $("#sendInfo").show();
            $("#friendCode").show();
        });
        socket.on('userlogin failure', function (data) {
            if (data.id == storeKey()) {
                $("#currentStatus").text("Incorrect user/pass combination...");
                window.location = 'usersetup.html';
            }
        });
        socket.on('friendrequest', function (data) {
            if (data.to == storeKey() || data.to == localStorage.getItem("username")) {
                var username = data.username;
                var id = data.id;
                var to = data.to;
                console.log("You received a friend request from: " + username);
                var request = confirm("Add " + username + " to your friends?");
                if (request == true) {
                    socket.emit('friendrequest accept', {
                        'username': localStorage.getItem("username"),
                        'to': id
                    });
                } else {
                    socket.emit('friendrequest deny', {
                        'username': localStorage.getItem("username"),
                        'to': id
                    });
                }
            }
        });
        socket.on('friendrequest accept', function (data) {
            if (data.to == storeKey() || data.to == localStorage.getItem("username")) {
                var username = data.username;
                alert(username + " accepted your friend request.");
                $("#friendsList").text("Friends: " + data.list);
            }

        });
        socket.on('friendrequest deny', function (data) {
            if (data.to == storeKey() || data.to == localStorage.getItem("username")) {
                var username = data.username;
                alert(username + " denied your friend request.");
            }
        });
        socket.on('newdata', function (data) {
            if (data.id == localStorage.getItem("idFollowing")) {

            }
        });
        socket.on('friendrequest already', function (data) {
            if (data.username == localStorage.getItem('username') || data.username == storeKey()) {
                alert("You silly, you're already friends!");
            }
        });
        socket.on(id, function (data) {
            console.log("Received unique request");
            var request = data.requestType;
        });
    }

    function sendCoordinates(coordX, coordY, accuracy, identifier) {
        var data = {
            'x': coordX,
            'y': coordY,
            'accuracy': accuracy,
            'id': identifier
        }
        socket.emit('locdata', data); // for-each loop and send data to each ID, with a code called locdata
        // so socket.emit(friendId, {'type': locdata, 'x': coordX, 'y': coordY, 'accuracy': accuracy, 'id': idOfSender})
    }
});