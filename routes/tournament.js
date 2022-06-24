var express = require('express');
var router = express.Router();

const { TOURNAMENT_REGISTRATION_TIME, TOURNAMENT_START_TIME, ROUND_START_TIME, tournamentStatus, playerStatus, roundStatus, requestTypes } = require ('../constants');
var { Tournament, Match } = require ('../schema/index');
const { getOpenTournament, getTournamentById, terminateIfUnderRegistered, startNextRoundAsync, canTournamentBeStarted } = require ('../services/tournament-service');
const { getRoundByTournament } = require ('../services/round-service');
const { getPlayerById, signup, signout, disQualify, joinRound } = require ('../services/player-service');
const { getSecondsLeft } = require ('../services/time-service');
const { getMatch } = require ('../services/match-service');

router.get ('/byId/:tournamentId/:userId', async (req, res, next) => {
    const { tournamentId, userId } = req.params;

    if (!tournamentId || !userId) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, error: 'Parameters not defined' });
    }

    const player = await getPlayerById (userId);
    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, error: 'Tournament not found', player });
    }

    let round = null;
    if (tournament.roundNumber > 0) {
        round = await getRoundByTournament (tournamentId, tournament.roundNumber);
    }

    res.json ({ success: true, requestType: requestTypes.BY_ID, tournament, round, player, timeLeft: getSecondsLeft (tournament) });
});

router.get ('/openTournament/:userId', async (req, res, next) => {
    const { userId } = req.params;

    if (!userId) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, error: 'Parameters not defined' });
    }

    const player = await getPlayerById (userId);
    const tournament = await getOpenTournament ();

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.OPEN_TOURNAMENT, error: 'Tournament not found', player });
    }

    res.json ({ success: true, requestType: requestTypes.OPEN_TOURNAMENT, tournament, player, timeLeft: getSecondsLeft (tournament) });
});

router.post ('/signup', async (req, res, next) => {
    const { userId, authToken } = req.body;

    if (!userId) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, error: 'Parameters not defined' });
    }

    let player = null;
    let tournament = await getOpenTournament ();

    if (!tournament) {
        tournament = await new Tournament ({
            minUsers: 2,
            nextStepTime: Date.now() + TOURNAMENT_REGISTRATION_TIME
        });

        terminateIfUnderRegistered (tournament._id);
    }

    if (tournament.registeredUserIds.indexOf (userId) != -1) {
        player = await getPlayerById (userId);

        return res.json ({ success: false, requestType: requestTypes.BY_ID, error: 'Already registered', tournament, player });
    }
    else if (tournament.status == tournamentStatus.REGISTRATION) {
        tournament.registeredUserIds.push (userId);

        if (canTournamentBeStarted (tournament)) {
            tournament.status = tournamentStatus.STARTING;
            tournament.eligibleUserIds = tournament.registeredUserIds;
            tournament.nextStepTime = Date.now() + ROUND_START_TIME;

            startNextRoundAsync (tournament._id, TOURNAMENT_START_TIME);
        }

        await tournament.save ();
    } else if (tournament.status == tournamentStatus.STARTING) {
        tournament.registeredUserIds.push (userId);
        tournament.eligibleUserIds.push (userId);

        await tournament.save ();
    }

    player = await signup (userId, tournament._id);

    res.json ({ success: true, requestType: requestTypes.SIGNUP, tournament, player, timeLeft: getSecondsLeft (tournament) });
});

router.post ('/signout', async (req, res, next) => {
    const { userId, authToken } = req.body;

    if (!userId) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, error: 'Parameters not defined' });
    }

    let player = null;
    let tournament = await getOpenTournament ();

    if (!tournament) {
        player = await getPlayerById (userId);

        return res.json ({ success: false, requestType: requestTypes.SIGNOUT, error: 'Tournament not found', player });
    }

    const index = tournament.registeredUserIds.indexOf (userId);
    if (index > -1) {
        tournament.registeredUserIds.splice (index, 1);

        await tournament.save ();

        player = await signout (userId);
    
        res.json ({ success: true, requestType: requestTypes.SIGNOUT, tournament, player, timeLeft: getSecondsLeft (tournament) });
    } else {
        player = await getPlayerById (userId);

        res.json ({ success: false, requestType: requestTypes.SIGNOUT, error: 'Player not registered', tournament, player, timeLeft: getSecondsLeft (tournament) });
    }
});

router.post ('/joinLobby/:tournamentId', async (req, res, next) => {
    const { tournamentId } = req.params;
    const { userId, authToken } = req.body;

    if (!tournamentId || !userId) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, error: 'Parameters not defined' });
    }

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

        return res.json ({ success: false, requestType: requestTypes.JOINLOBBY, round, error: 'You are late to round', player });
    }
    
    round.joinedUserIds.push (userId);

    const index = round.eligibleUserIds.indexOf (userId);
    if (index > -1) {
        round.eligibleUserIds.splice (index, 1);
    }

    await round.save ();

    player = await joinRound (userId, round._id);

    if (round.joinedUserIds.length % 2 == 0) {
        let match = await new Match ({
            tournamentId: round.tournamentId,
            roundNumber: round.roundNumber,
            isStarted: false,
            home: round.joinedUserIds[round.joinedUserIds.length - 1],
            away: round.joinedUserIds[round.joinedUserIds.length - 2]
        });

        await match.save ();
    }

    res.json ({ success: true, requestType: requestTypes.JOINLOBBY, round, player, timeLeft: getSecondsLeft (tournament) });
});

router.get ('/matchByTournamentId/:tournamentId/:roundNumber/:userId', async (req, res, next) => {
    const { tournamentId, roundNumber, userId } = req.params;

    if (!tournamentId || !roundNumber || !userId) {
        return res.json ({ success: false, requestType: requestTypes.MATCH_BY_TOURNAMENT_ID, error: 'Parameters not defined' });
    }

    const match = await getMatch (tournamentId, roundNumber, userId);

    if (!match) {
        return res.json ({ success: false, requestType: requestTypes.MATCH_BY_TOURNAMENT_ID, error: 'Match not found' });
    }
    
    return res.json ({ success: true, requestType: requestTypes.MATCH_BY_TOURNAMENT_ID, match });
});

router.get ('/getUsernames/:tournamentId', async (req, res, next) => {
    const { tournamentId } = req.params;

    if (!tournamentId) {
        return res.json ({ success: false, requestType: requestTypes.GET_USERNAMES, error: 'Parameters not defined' });
    }

    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.GET_USERNAMES, error: 'Tournament not found', tournament });
    }

    let players = [];
    for (let step = 0; step < tournament.registeredUserIds.length; step++) {
        let player = await getPlayerById (tournament.registeredUserIds[step]);

        players.push ({ userId: player.userId, username: player.username });
    }
    
    return res.json ({ success: true, requestType: requestTypes.GET_USERNAMES, players });
});

router.post ('/matchStarted/:tournamentId', async (req, res, next) => {
    const { tournamentId } = req.params;
    const { userIdMaster, userIdOpponent, authToken } = req.body;

    if (!tournamentId || !userIdMaster || !userIdOpponent) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, error: 'Parameters not defined' });
    }

    const player = await getPlayerById (userIdMaster);
    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.MATCH_STARTED, error: 'Tournament not found', tournament, player });
    }

    let round = await getRoundByTournament (tournament._id, tournament.roundNumber);

    if (!round) {
        return res.json ({ success: false, requestType: requestTypes.MATCH_STARTED, error: 'Round not found', tournament, round, player });
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

    if (!tournamentId || !userIdMaster || !userIdOpponent) {
        return res.json ({ success: false, requestType: requestTypes.BY_ID, error: 'Parameters not defined' });
    }

    const player = await getPlayerById (userIdMaster);
    const tournament = await getTournamentById (tournamentId);

    if (!tournament) {
        return res.json ({ success: false, requestType: requestTypes.MATCH_ENDED, error: 'Tournament not found', tournament, player });
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
