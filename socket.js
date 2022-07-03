var redis = require("redis");
var socketIO = require("socket.io");

var client = redis.createClient({
    url: 'redis://default:t0iTnrjVDMIlch2OpiEITlKxnkxOja5A@redis-14783.c293.eu-central-1-1.ec2.cloud.redislabs.com:14783'
});
client.on('connect', function () {
    console.log('Connected!');
});
client.on('error', err => {
    console.log('Error ' + err);
});

var io = null;

const setUpSocket = (server) => {
    io = socketIO(server);

    io.sockets.on('connection', function (socket) {
        console.log("Socket ID: " + socket.id);

        socket.on("login", async (userId) => {
            await client.connect();

            await client.set(userId, socket.id, function (err) {
                if (err) {
                    console.log("Error: " + err);

                    throw err;
                }
            });

            await client.quit();
        });

        socket.on("logout", async (userId) => {
            await client.connect();

            await client.set(userId, "", function (err) {
                if (err) {
                    console.log("Error: " + err);
                }
            });

            await client.quit();
        });

        socket.on("watchTournament", async (tournamentId) => {
            let { isInRoom, sockets } = await isSocketInRoom (socket.id, tournamentId);

            let inRoomIds = "";
            for (const inRoomSocket of sockets) {
                inRoomIds = inRoomIds + inRoomSocket.id;
            }

            if (isInRoom) {
                socket.emit("info", "watchTournament - already in room, #: " + inRoomIds);
            } else {
                io.in(socket.id).socketsJoin(tournamentId);

                // sockets = await io.in(tournamentId).fetchSockets();
                
                socket.emit("info", "watchTournament - added to room, #: " + inRoomIds);
            }
        });

        socket.on("unwatchTournament", async (tournamentId) => {
            let { isInRoom, sockets } = await isSocketInRoom (socket.id, tournamentId);

            let inRoomIds = "";
            for (const inRoomSocket of sockets) {
                inRoomIds = inRoomIds + inRoomSocket.id;
            }

            if (isInRoom) {
                io.in(socket.id).socketsLeave(tournamentId);
                
                // sockets = await io.in(tournamentId).fetchSockets();

                socket.emit("info", "unwatchTournament - left room, #: " + inRoomIds);
            } else {
                socket.emit("info", "unwatchTournament - not in room, #: " + inRoomIds);
            }
        });
    });

    io.of("/").adapter.on("create-room", (room) => {
        console.log(`room "${room}" was created`);
    });

    io.of("/").adapter.on("delete-room", (room) => {
        console.log(`room "${room}" was deleted`);
    });
      
    io.of("/").adapter.on("join-room", (room, id) => {
        console.log(`socket ${id} has joined room "${room}"`);
    });
      
    io.of("/").adapter.on("leave-room", (room, id) => {
        console.log(`socket ${id} has left room "${room}"`);
    });
};

const isSocketInRoom = async (socketId, tournamentId) => {
    const sockets = await io.in(tournamentId).fetchSockets();

    const indexOf = sockets.findIndex ((socket) => socket.id == socketId);
    const isInRoom = indexOf != -1;

    return {
        isInRoom,
        sockets
    };
};

const getWatchers = async (tournamentId) => {
    let sockets;
    if (tournamentId != '') {
        sockets = await io.in ('' + tournamentId).fetchSockets ();
    } else {
        sockets = await io.fetchSockets ();
    }

    console.log (tournamentId + ", " + sockets.length);

    return sockets;
}

const emitCancelled = (tournamentId) => {
    io.in ('' + tournamentId).emit("tournamentCancelled");
}

const removeUnregistered = async (tournamentId, eligibleUserIds) => {
    const eligibleSocketIds = await getSocketsFromIds (eligibleUserIds);

    let sockets = await io.in ('' + tournamentId).fetchSockets ();
    for (const socket of sockets) {
        const index = eligibleSocketIds.indexOf (socket.id);
        if (index == -1) {
            io.in (socket.id).socketsLeave ('' + tournamentId);
        }
    }
}

const removeEveryone = (tournamentId) => {
    io.socketsLeave('' + tournamentId);
}

const removePlayer = async (tournamentId, userId) => {
    await client.connect ();
    
    const socketId = await client.get (userId);
    
    io.in (socketId).socketsLeave ('' + tournamentId);

    await client.quit ();
}

const startNewRound = async (tournamentId, roundNumber) => {
    let sockets = await io.in ('' + tournamentId).fetchSockets ();
    for (const socket of sockets) {
        socket.emit("startNewRound", { roundNumber });
    }
}

const getSocketsFromIds = async (eligibleUserIds) => {
    await client.connect ();

    let eligibleSocketIds = [];
    for (const eligibleUserId of eligibleUserIds) {
        const socketId = await client.get (eligibleUserId);

        eligibleSocketIds.push (socketId);
    }

    await client.quit ();

    return eligibleSocketIds;
}

module.exports = {
    getWatchers,
    setUpSocket,
    removeUnregistered,
    removeEveryone,
    removePlayer,
    startNewRound,
    emitCancelled
};