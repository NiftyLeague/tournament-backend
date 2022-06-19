const logger = require('../logger');

const { playerStatus } = require ('../constants');
var { Player } = require ('../schema/index');

const getPlayerById = async (userId) => {
    let player = await Player.findOne ({ userId });

    if (!player) {
        player = await new Player ({ userId });
        await player.save ();
    }

    return player;
}

const updatePlayerById = async (userId, tournamentId, roundId, playerState) => {
    let player = await getPlayerById (userId);

    player.tournamentId = tournamentId;
    player.roundId = roundId;
    player.status = playerState;

    await player.save ();

    return player;
}

const signup = async (userId, tournamentId) => {
    let player = await getPlayerById (userId);

    player.tournamentId = tournamentId;
    player.roundId = '';
    player.status = playerStatus.REGISTERED;

    await player.save ();

    return player;
}

const signout = async (userId) => {
    let player = await getPlayerById (userId);

    player.tournamentId = '';
    player.roundId = '';
    player.status = playerStatus.UNREGISTERED;

    await player.save ();

    return player;
}

const disQualify = async (userId) => {
    let player = await getPlayerById (userId);

    player.status = playerStatus.DISQUALIFIED;

    await player.save ();

    return player;
}

const joinRound = async (userId, roundId) => {
    let player = await getPlayerById (userId);

    player.roundId = roundId;

    await player.save ();

    return player;
}

module.exports = {
    getPlayerById,
    updatePlayerById,
    signup,
    signout,
    disQualify,
    joinRound
}