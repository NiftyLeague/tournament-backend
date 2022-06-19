var express = require('express');
var router = express.Router();

const { TOURNAMENT_START_TIME, tournamentStatus, playerStatus, roundStatus, requestTypes } = require ('../constants');
var { Tournament, Player } = require ('../schema/index');
const { getOpenTournament, getTournamentById, terminateIfUnderRegistered, startNextRoundAsync, canTournamentBeStarted } = require ('../services/tournament-service');
const { getRoundByTournament } = require ('../services/round-service');

router.get ('/byId/:tournamentId', async (req, res, next) => {
    const { tournamentId, userId } = req.params;

    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, playerState: playerStatus.UNREGISTERED });
    }

    let playerState = playerStatus.UNREGISTERED;
    if (userId) {
        if (tournament.registeredUserIds.indexOf (userId) != -1) {
            playerState = playerStatus.REGISTERED;
        }

        if (tournament.round > 0 && tournament.eligibleUserIds.indexOf (userId) == -1) {
            playerState = playerStatus.DISQUALIFIED;
        }
    }

    res.json ({ success: true, requestType: requestTypes.BY_ID, tournament, playerState });
});

router.get ('/openTournament', async (req, res, next) => {
    const tournament = await getOpenTournament ();

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.OPEN_TOURNAMENT, playerState: playerStatus.UNREGISTERED });
    }

    res.json ({ success: true, requestType: requestTypes.OPEN_TOURNAMENT, tournament, playerState: playerStatus.UNREGISTERED });
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

    res.json ({ success: true, requestType: requestTypes.SIGNUP, tournament, playerState: playerStatus.REGISTERED });
});

router.post ('/signout', async (req, res, next) => {
    const { userId, authToken } = req.body;

    let tournament = await getOpenTournament ();

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.SIGNOUT, playerState: playerStatus.UNREGISTERED });
    }

    const index = tournament.registeredUserIds.indexOf (userId);
    if (index > -1) {
        tournament.registeredUserIds.splice (index, 1);

        await tournament.save ();
    }

    res.json ({ success: true, requestType: requestTypes.SIGNOUT, tournament, playerState: playerStatus.UNREGISTERED });
});

router.post ('/joinLobby/:tournamentId', async (req, res, next) => {
    const { tournamentId } = req.params;
    const { userId, authToken } = req.body;

    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.JOINLOBBY, tournament, error: 'Tournament not found', playerState: playerStatus.UNREGISTERED });
    }

    let round = await getRoundByTournament (tournament._id, tournament.roundNumber);

    if (!round) {
        return res.json ({ success: false, requestType: requestTypes.JOINLOBBY, round, error: 'Round not found', playerState: playerStatus.UNREGISTERED });
    } else if (round.status == roundStatus.CLOSED) {
        return res.json ({ success: false, requestType: requestTypes.JOINLOBBY, round, errror: 'You are late to round', playerState: playerStatus.DISQUALIFIED });
    }
    
    round.joinedUserIds.push (userId);

    const index = round.eligibleUserIds.indexOf (userId);
    if (index > -1) {
        round.eligibleUserIds.splice (index, 1);
    }

    await round.save ();

    res.json ({ success: true, requestType: requestTypes.JOINLOBBY, round, playerState: playerStatus.REGISTERED });
});

router.post ('/matchStarted/:tournamentId', async (req, res, next) => {
    const { tournamentId } = req.params;
    const { userIdMaster, userIdOpponent, authToken } = req.body;

    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.MATCH_STARTED, tournament, playerState: playerStatus.UNREGISTERED });
    }

    let round = await getRoundByTournament (tournament._id, tournament.roundNumber);

    if (!round) {
        return res.json ({ success: false, requestType: requestTypes.MATCH_STARTED, round, playerState: playerStatus.UNREGISTERED });
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

    res.json ({ success: true, requestType: requestTypes.MATCH_STARTED, round, playerState: playerStatus.REGISTERED });
});

router.post ('/matchEnded/:tournamentId', async (req, res, next) => {
    const { tournamentId } = req.params;
    const { userIdMaster, userIdOpponent, hasMasterWon, authToken } = req.body;

    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.MATCH_ENDED, tournament, playerState: playerStatus.UNREGISTERED });
    }

    let playerState = playerStatus.REGISTERED;
    if (hasMasterWon) {
        tournament.eligibleUserIds.push (userIdMaster);
    } else {
        tournament.eligibleUserIds.push (userIdOpponent);
        playerState = playerStatus.DISQUALIFIED;
    }

    await tournament.save ();

    res.json ({ success: true, requestType: requestTypes.MATCH_ENDED, tournament, playerState });
});

module.exports = router;
