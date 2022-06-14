var { Round } = require ('../schema/index');

const getRoundByTournament = async (tournamentId, roundNumber) => {
    const round = Round.findOne ({ tournamentId, roundNumber });

    return round;
}

module.exports = {
    getRoundByTournament
}