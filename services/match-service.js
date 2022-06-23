var { Match } = require ('../schema/index');

const getMatch = async (tournamentId, roundNumber, userId) => {
    let match = await Match.findOne ({ tournamentId, roundNumber, home: userId });

    if (!match) {
        match = await Match.findOne ({ tournamentId, roundNumber, away: userId });
    }

    return match;
}

module.exports = {
    getMatch
}