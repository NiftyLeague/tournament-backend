var express = require('express');
var router = express.Router();

const { requestTypes } = require ('../constants');
const { getTournamentById } = require ('../services/tournament-service');
const { getRoundByTournament } = require ('../services/round-service');
const { getPlayerById } = require ('../services/player-service');
const { getSecondsLeft } = require ('../services/time-service');

router.get ('/byTournamentId/:tournamentId/:roundNumber/:userId', async (req, res, next) => {
    const { tournamentId, roundNumber, userId } = req.params;

    if (!tournamentId || !roundNumber || !userId) {
        return res.json ({ success: false, requestType: requestTypes.ROUND_BY_TOURNAMENT_ID, error: 'Parameters not defined' });
    }

    const player = await getPlayerById (userId);
    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.ROUND_BY_TOURNAMENT_ID, error: 'Tournament not found', player });
    }

    const round = await getRoundByTournament (tournamentId, roundNumber);

    if (!round) {
        return res.json ({ success: false, requestType: requestTypes.ROUND_BY_TOURNAMENT_ID, error: 'Round not found', player });
    }

    res.json ({ success: true, requestType: requestTypes.ROUND_BY_TOURNAMENT_ID, tournament, round, player, timeLeft: getSecondsLeft (tournament) });
});

module.exports = router;