var express = require('express');
var router = express.Router();

const { requestTypes } = require ('../constants');
const { getPlayerById } = require ('../services/player-service');

router.get ('/:userId', async (req, res, next) => {
    const { userId } = req.params;

    const player = await getPlayerById (userId);

    if (!player) {
        return res.json ({ success: false, requestType: requestTypes.PLAYER_BY_ID });
    }

    res.json ({ success: true, requestType: requestTypes.PLAYER_BY_ID, player });
});

module.exports = router;