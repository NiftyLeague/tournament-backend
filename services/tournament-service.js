const { TOURNAMENT_REGISTRATION_TIME, ROUND_START_TIME, ROUND_TIME, tournamentStatus, roundStatus } = require ('../constants');
const { leaveTournament } = require ('../services/player-service');
const { getRoundById } = require ('../services/round-service');
var { Tournament, Round } = require ('../schema/index');

const asyncTimeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const getOpenTournament = async () => {
    let tournament = await Tournament.findOne ({ status: tournamentStatus.REGISTRATION });

    if (!tournament) {
        tournament = await Tournament.findOne ({ status: tournamentStatus.STARTING });
    }

    return tournament;
}

const getTournamentById = async (tournamentId) => {
    const tournament = await Tournament.findById (tournamentId);

    return tournament;
}

const terminateIfUnderRegistered = async (tournamentId) => {
    await asyncTimeout (TOURNAMENT_REGISTRATION_TIME);

    let tournament = await getTournamentById (tournamentId);

    if (tournament.status !== tournamentStatus.REGISTRATION)
        return;

    tournament.status = tournamentStatus.CANCELLED;
    await tournament.save ();
    
    for (let step = 0; step < tournament.registeredUserIds.length; step++) {
        await leaveTournament (tournament.registeredUserIds[step], tournamentId);
    }
}

const startNextRoundAsync = async (tournamentId, waitTime) => {
    await asyncTimeout (waitTime);

    let tournament = await getTournamentById (tournamentId);

    if (tournament.eligibleUserIds.length < 2) {
        tournament.status = tournamentStatus.ENDED;

        await tournament.save ();

        return;
    }

    let round = await new Round ({
        tournamentId: tournament._id,
        eligibleUserIds: tournament.eligibleUserIds,
        roundNumber: tournament.roundNumber + 1
    });
    await round.save ();
    
    tournament.status = tournamentStatus.LOBBY;
    tournament.roundNumber = tournament.roundNumber + 1;
    tournament.eligibleUserIds = [];
    tournament.nextStepTime = Date.now() + ROUND_START_TIME;
    await tournament.save ();

    closeRoundAsync (tournamentId, round._id, ROUND_START_TIME);
}

const canTournamentBeStarted = (tournament) => {
    return tournament.registeredUserIds.length >= tournament.minUsers && tournament.status == tournamentStatus.REGISTRATION;
}

const closeRoundAsync = async (tournamentId, roundId, waitTime) => {
    await asyncTimeout (waitTime);
    
    let tournament = await getTournamentById (tournamentId);
    let round = await getRoundById (roundId);

    if (round.joinedUserIds.length == 0 && round.matchedUserIds.length == 0)
    {
        tournament.status = tournamentStatus.ENDED;
        await tournament.save ();
        
        round.status = roundStatus.CLOSED;
        await round.save ();

        return;
    }

    round.status = roundStatus.CLOSED;

    if (round.joinedUserIds.length > 0) {
        for (let step = 0; step < round.joinedUserIds.length; step++) {
            tournament.eligibleUserIds.push (round.joinedUserIds[step]);
        }

        round.joinedUserIds = [];
    }
    
    tournament.status = tournamentStatus.GAMEPLAY;
    tournament.nextStepTime = Date.now () + ROUND_TIME;
    await tournament.save ();

    await round.save ();

    startNextRoundAsync (tournamentId, ROUND_TIME);
}

module.exports = {
    getOpenTournament,
    getTournamentById,
    terminateIfUnderRegistered,
    startNextRoundAsync,
    canTournamentBeStarted
};