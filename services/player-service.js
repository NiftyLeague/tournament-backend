const logger = require('../logger');
var { Player } = require ('../schema/index');

const getPlayerById = async (userId) => {
    let player = await Player.findOne ({ userId });

    if (!player) {
        player = await new Player ({ userId });
        await player.save ();
    }

    return player;
}

module.exports = {
    getPlayerById
}