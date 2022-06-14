const { TOURNAMENT_REGISTRATION_TIME, ROUND_START_TIME, tournamentStatus, roundStatus } = require ('../constants');
var { Tournament, Round } = require ('../schema/index');

const asyncTimeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const getOpenTournament = async () => {
    const tournament = Tournament.findOne ({ status: tournamentStatus.REGISTRATION });

    return tournament;
}

const getTournamentById = async (tournamentId) => {
    const tournament = Tournament.findById (tournamentId);

    return tournament;
}

const terminateIfUnderRegistered = async (tournamentId) => {
    await asyncTimeout (TOURNAMENT_REGISTRATION_TIME);

    let tournament = await getTournamentById (tournamentId);

    if (tournament.status !== tournamentStatus.REGISTRATION)
        return;

    tournament.status = tournamentStatus.CANCELLED;
    await tournament.save ();
}

const startNextRoundAsync = async (tournamentId, waitTime) => {
    await asyncTimeout (waitTime);

    let tournament = await getTournamentById (tournamentId);

    let round = await new Round ({
        tournamentId: tournament._id,
        eligibleUserIds: tournament.eligibleUserIds,
        roundNumber: tournament.roundNumber + 1
    });
    await round.save ();
    
    tournament.roundNumber = tournament.roundNumber + 1;
    tournament.eligibleUserIds = [];
    await tournament.save ();

    closeRoundAsync (tournamentId, round._id, ROUND_START_TIME);
}

const isTournamentStarting = (tournament) => {
    return tournament.registeredUserIds.length > tournament.minUsers;
}

const closeRoundAsync = async (tournamentId, roundId, waitTime) => {
    await asyncTimeout (waitTime);
    
    let round = await Round.findById (roundId);

    round.status = roundStatus.CLOSED;

    if (round.joinedUserIds.length > 0) {
        let tournament = await getTournamentById (tournamentId);

        for (let step = 0; step < 5; step++) {
            tournament.eligibleUserIds.push (round.joinedUserIds[step]);
        }

        await tournament.save ();

        round.joinedUserIds = [];
    }

    await round.save ();
}

module.exports = {
    getOpenTournament,
    getTournamentById,
    terminateIfUnderRegistered,
    startNextRoundAsync,
    isTournamentStarting
};