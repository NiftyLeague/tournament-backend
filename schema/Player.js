const { Schema, model, models } = require ('mongoose');
const { playerStatus } = require ('../constants');

const playerSchema = new Schema ({
    status: { type: String, enum: Object.values (playerStatus), default: playerStatus.UNREGISTERED },
    userId: String,
    tournamentId: String,
    roundId: String
}, { collection: 'players', timestamps: { createdAt: 'created', updatedAt: 'updated' }});
module.exports = models.Player || model ('Player', playerSchema);