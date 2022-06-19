module.exports = {
    TOURNAMENT_REGISTRATION_TIME: 60000,
    TOURNAMENT_START_TIME: 30000,
    ROUND_START_TIME: 20000,
    ROUND_TIME: 180000,
    tournamentStatus: {
        REGISTRATION: 'registration',
        STARTING: 'starting',
        LOBBY: 'lobby',
        GAMEPLAY: 'gameplay',
        ENDED: 'ended',
        CANCELLED: 'cancelled'
    },
    playerStatus: {
        UNREGISTERED: 'unregistered',
        REGISTERED: 'registered',
        DISQUALIFIED: 'disqualified'
    },
    roundStatus: {
        OPEN: 'open',
        CLOSED: 'closed'
    },
    requestTypes: {
        PLAYER_BY_ID: 'playerById',
        BY_ID: 'tournamentById',
        OPEN_TOURNAMENT: 'openTournament',
        SIGNUP: 'signup',
        SIGNOUT: 'signout',
        JOINLOBBY: 'joinLobby',
        MATCH_STARTED: 'matchStarted',
        MATCH_ENDED: 'matchEnded'
    }
}