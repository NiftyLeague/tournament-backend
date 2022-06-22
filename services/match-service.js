var { Match } = require ('../schema/index');

const getMatch = async (tournamentId, userId) => {
    let match = await Match.findOne ({ tournamentId, home: userId });

    if (!match) {
        match = await Match.findOne ({ tournamentId, away: userId });
    }

    return match;
}

module.exports = {
    getMatch
}