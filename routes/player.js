var express = require('express');
var router = express.Router();

const { playerStatus, requestTypes } = require ('../constants');
const { getPlayerById } = require ('../services/player-service');

router.get ('/:userId', async (req, res, next) => {
    const { userId } = req.params;

    if (!userId) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, error: 'Parameters not defined' });
    }

    const player = await getPlayerById (userId);

    res.json ({ success: true, requestType: requestTypes.PLAYER_BY_ID, player });
});

router.post ('/leave', async (req, res, next) => {
    const { userId, authToken } = req.body;

    if (!userId) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, error: 'Parameters not defined' });
    }

    const player = await getPlayerById (userId);

    player.status = playerStatus.UNREGISTERED;
    player.tournamentId = '';
    player.roundId = '';

    await player.save ();

    res.json ({ success: true, requestType: requestTypes.PLAYER_LEAVE, player });
});

module.exports = router;