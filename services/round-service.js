var { Round } = require ('../schema/index');

const getRoundById = async (roundId) => {
    let round = await Round.findById (roundId);

    return round;
}

const getRoundByTournament = async (tournamentId, roundNumber) => {
    const round = Round.findOne ({ tournamentId, roundNumber });

    return round;
}

module.exports = {
    getRoundByTournament,
    getRoundById
}