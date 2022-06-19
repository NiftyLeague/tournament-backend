var express = require('express');
var router = express.Router();

const { TOURNAMENT_START_TIME, tournamentStatus, playerStatus, roundStatus, requestTypes } = require ('../constants');
var { Tournament, Player } = require ('../schema/index');
const { getOpenTournament, getTournamentById, terminateIfUnderRegistered, startNextRoundAsync, canTournamentBeStarted } = require ('../services/tournament-service');
const { getRoundByTournament } = require ('../services/round-service');
const { getPlayerById, signup, signout, disQualify } = require ('../services/player-service');

router.get ('/byId/:tournamentId/:userId', async (req, res, next) => {
    const { tournamentId, userId } = req.params;

    const player = await getPlayerById (userId);
    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, player });
    }

    res.json ({ success: true, requestType: requestTypes.BY_ID, tournament, player });
});

router.get ('/openTournament/:userId', async (req, res, next) => {
    const { userId } = req.params;

    const player = await getPlayerById (userId);
    const tournament = await getOpenTournament ();

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.OPEN_TOURNAMENT, player });
    }

    res.json ({ success: true, requestType: requestTypes.OPEN_TOURNAMENT, tournament, player });
});

router.post ('/signup', async (req, res, next) => {
    const { userId, authToken } = req.body;

    let tournament = await getOpenTournament ();

    if (!tournament) {
        tournament = await new Tournament ({
            minUsers: 2,
            nextStepTime: Date.now() + TOURNAMENT_START_TIME
        });

        terminateIfUnderRegistered (tournament._id);
    }

    if (tournament.status == tournamentStatus.REGISTRATION) {
        tournament.registeredUserIds.push (userId);

        if (canTournamentBeStarted (tournament)) {
            tournament.status = tournamentStatus.STARTING;
            tournament.eligibleUserIds = tournament.registeredUserIds;

            startNextRoundAsync (tournament._id, TOURNAMENT_START_TIME);
        }

        await tournament.save ();
    } else if (tournament.status == tournamentStatus.STARTING) {
        tournament.eligibleUserIds.push (userId);

        await tournament.save ();
    }

    const player = await signup (userId, tournament._id);

    res.json ({ success: true, requestType: requestTypes.SIGNUP, tournament, player });
});

router.post ('/signout', async (req, res, next) => {
    const { userId, authToken } = req.body;

    let player = null;
    let tournament = await getOpenTournament ();

    if (!tournament) {
        player = await getPlayerById (userId);

        return res.json ({ success: false, requestType: requestTypes.SIGNOUT, player });
    }

    const index = tournament.registeredUserIds.indexOf (userId);
    if (index > -1) {
        tournament.registeredUserIds.splice (index, 1);

        await tournament.save ();
    }

    player = await signout (userId);

    res.json ({ success: true, requestType: requestTypes.SIGNOUT, tournament, player });
});

router.post ('/joinLobby/:tournamentId', async (req, res, next) => {
    const { tournamentId } = req.params;
    const { userId, authToken } = req.body;

    let player = null;
    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        player = await getPlayerById (userId);

        return res.json ({ success: false, requestType: requestTypes.JOINLOBBY, tournament, error: 'Tournament not found', player });
    }

    let round = await getRoundByTournament (tournament._id, tournament.roundNumber);

    if (!round) {
        player = await getPlayerById (userId);

        return res.json ({ success: false, requestType: requestTypes.JOINLOBBY, round, error: 'Round not found', player });
    } else if (round.status == roundStatus.CLOSED) {
        player = await disQualify (userId);

        return res.json ({ success: false, requestType: requestTypes.JOINLOBBY, round, errror: 'You are late to round', player });
    }
    
    round.joinedUserIds.push (userId);

    const index = round.eligibleUserIds.indexOf (userId);
    if (index > -1) {
        round.eligibleUserIds.splice (index, 1);
    }

    await round.save ();

    player = await joinRound (userId, round._id);

    res.json ({ success: true, requestType: requestTypes.JOINLOBBY, round, player });
});

router.post ('/matchStarted/:tournamentId', async (req, res, next) => {
    const { tournamentId } = req.params;
    const { userIdMaster, userIdOpponent, authToken } = req.body;

    const player = await getPlayerById (userId);
    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.MATCH_STARTED, tournament, player });
    }

    let round = await getRoundByTournament (tournament._id, tournament.roundNumber);

    if (!round) {
        return res.json ({ success: false, requestType: requestTypes.MATCH_STARTED, round, player });
    }

    round.matchedUserIds.push (userIdMaster);
    round.matchedUserIds.push (userIdOpponent);

    let index = round.joinedUserIds.indexOf (userIdMaster);
    if (index > -1) {
        round.joinedUserIds.splice (index, 1);
    }
    index = round.joinedUserIds.indexOf (userIdOpponent);
    if (index > -1) {
        round.joinedUserIds.splice (index, 1);
    }

    await round.save ();

    res.json ({ success: true, requestType: requestTypes.MATCH_STARTED, round, player });
});

router.post ('/matchEnded/:tournamentId', async (req, res, next) => {
    const { tournamentId } = req.params;
    const { userIdMaster, userIdOpponent, hasMasterWon, authToken } = req.body;

    let player = await getPlayerById (userIdMaster);
    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.MATCH_ENDED, tournament, player });
    }

    if (hasMasterWon) {
        tournament.eligibleUserIds.push (userIdMaster);
        
        await disQualify (userIdOpponent);
    } else {
        tournament.eligibleUserIds.push (userIdOpponent);
        
        await disQualify (userIdMaster);
    }

    await tournament.save ();

    res.json ({ success: true, requestType: requestTypes.MATCH_ENDED, tournament, player });
});

module.exports = router;
