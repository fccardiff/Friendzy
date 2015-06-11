var application = require('express')();
var http = require('http').Server(application);
var io = require('socket.io').listen(http);
var port = 3000;
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('users.db');
var crypto = require('crypto');
var salt = "8vK7qIoP";
db.run("CREATE TABLE IF NOT EXISTS USERS (username TEXT PRIMARY KEY, pass TEXT NOT NULL, id TEXT NOT NULL);");
db.run("CREATE TABLE IF NOT EXISTS FRIENDS (username TEXT PRIMARY KEY, friends TEXT);");
io.on('connection', function (socket) {
    socket.on('getuserlist', function (info) {
        var id = info.id;
        var userList;
        db.all("SELECT username FROM USERS", function (err, data) {
            userList = data;
        });
        socket.emit(id, {
            'requestType': 'userList'
        });
        console.log("Emitted list: " + userList + " to " + id);
    });
    socket.on('reconnection', function (info) {
        console.log("Received reconnect event");
        var user = info.user.toLowerCase();
        var pass = info.pass;
        var id = info.id;
        var hashedPass;
        var secondHashedPass;
        var boolDone;
        db.run("INSERT OR IGNORE INTO FRIENDS VALUES (" + "'" + user + "'" + ", " + "'" + "" + "'" + ");");
        hashPassword(pass, function (done) {
            hashedPass = done;
            db.all("SELECT pass FROM USERS WHERE username=" + "'" + user + "'", function (err, data) {
                secondHashedPass = data; // TODO Emit success event when user is valid, otherwise throw an error
                if (secondHashedPass[0]) {
                    if (hashedPass == secondHashedPass[0].pass) {
                        socket.emit('userlogin success', {
                            'user': user,
                            'pass': pass,
                            'id': id
                        });
                    }
                } else {
                    socket.emit('userlogin failure', {
                        'user': user,
                        'pass': pass,
                        'id': id
                    });
                }
            });
        });
    });
    socket.on('friendrequest', function (info) {
        var username = info.username;
        var id = info.id;
        var to = info.to;
        // todo check if username in list
        io.emit('friendrequest', info);
    });
    socket.on('friendrequest accept', function (info) {
        db.all("SELECT friends FROM FRIENDS WHERE username=" + "'" + info.username + "'", function (err, data) {
            if (err) throw err;
            var friendsList = data[0].friends;
            console.log("returned friendsList as " + friendsList);
            if (!data[0].friends) {
                friendsList = info.to + ","; // Get username of to, add them to friends
                db.run("INSERT OR IGNORE INTO FRIENDS VALUES ('" + info.username + "', " + "'" + friendsList + "'" + ");");
                db.run("UPDATE FRIENDS SET friends=" + "'" + friendsList + "'" + " WHERE username=" + "'" + info.username + "'");
                io.emit('friendrequest accept', {
                    'to': info.to, // also send reverse friend request
                    'username': info.username,
                    'list': friendsList
                });
                io.emit('friendrequest accept', {
                    'to': info.username,
                    'username': info.to
                });
            } else {
                if (JSON.stringify(friendsList).indexOf(info.to) == -1) {
                    friendsList = friendsList + info.to + ","; // Get username of to, add them to friends
                    db.run("INSERT OR IGNORE INTO FRIENDS VALUES ('" + info.username + "', " + "'" + friendsList + "'" + ");");
                    db.run("UPDATE FRIENDS SET friends=" + "'" + friendsList + "'" + " WHERE username=" + "'" + info.username + "'");
                    io.emit('friendrequest accept', {
                        'to': info.to,
                        'username': info.username,
                        'list': friendsList
                    });
                    io.emit('friendrequest accept', {
                        'to': info.username,
                        'username': info.to
                    });
                } else {
                    io.emit('friendrequest already', {
                        'username': info.to // check if this is sending to the right person
                    });
                }
            }
        });
    });
    socket.on('friendrequest deny', function (info) {
        io.emit('friendrequest deny', {
            'to': info.to,
            'username': info.username
        });
    });
    socket.on('locdata', function (info) {
        console.log("RECEIVED LOCDATA: " + JSON.stringify(info));
        // give the coords to everyone else who's listening
        db.all("SELECT username FROM USERS WHERE id=" + "'" + info.id + "'", function (err, data) {
            console.log("locData is received, and so the username is " + data[0].username);
            db.all("SELECT friends FROM FRIENDS WHERE username=" + "'" + data[0].username + "'", function (err, data) {
                console.log("and their friends are " + data[0].friends.split(','));
            });
            io.emit('newdata', info);
            // for loop iterating over friends
            // if friends contains userid or username, then push to array
            // send data to all friends in array with for loop
        });
        // emit locData to everyone (ON FRIENDSLIST)
        // id is the ID, so emit to all
    });
    socket.on('newuser', function (data) {
        var user = data.user.toLowerCase();
        var pass = data.pass;
        var id = data.id;
        var allowed = true;
        var hashedPass;
        hashPassword(pass, function (done) {
            hashedPass = done;
            db.all("SELECT username FROM USERS WHERE username=" + "'" + user + "'", function (err, dataNew) {
                if (dataNew.length) {
                    io.emit('newusererror', {
                        'id': id,
                        'user': user
                    });
                    allowed = false;
                }
                if (allowed) {
                    db.run("INSERT OR IGNORE INTO USERS VALUES (" + "'" + user + "'" + ", " + "'" + hashedPass + "'" + ", " + "'" + id + "'" + ");");
                    db.run("INSERT OR IGNORE INTO FRIENDS VALUES (" + "'" + user + "'" + ", " + "'" + "" + "'" + ");");
                    io.emit('newuserconfirm', {
                        'id': id,
                        'user': user,
                        'pass': pass
                    });
                }
            });
        });

    });
});

function hashPassword(pass, done) {
    crypto.pbkdf2(pass, salt, 4096, 512, function (err, key) {
        console.log('hashing stuff');
        if (err) throw err;
        done(key.toString('hex'));
    });
}

var readline = require('readline');

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
rl.on('line', function (cmd) {
    if (cmd == 'stop') {
        process.exit();
    }
});
http.listen(port, function () {
    console.log('[LocateFriends] Listening on *:' + port);
});