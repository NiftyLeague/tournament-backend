var { Player } = require ('../schema/index');

const getPlayerById = async (userId) => {
    const player = Player.findOne ({ userId });

    return player;
}

module.exports = {
    getPlayerById
}