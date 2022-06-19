const logger = require('../logger');

const getSecondsLeft = (tournament) => {
    return (tournament.nextStepTime - Date.now()) / 1000;
}

module.exports = {
    getSecondsLeft
}