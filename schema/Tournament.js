const { Schema, model, models } = require ('mongoose');

const { tournamentStatus } = require ('../constants');

const tournamentSchema = new Schema ({
    status: { type: String, enum: Object.values (tournamentStatus), default: tournamentStatus.REGISTRATION },
    registeredUserIds: [],
    eligibleUserIds: [],
    roundNumber: { type: Number, default: 0 },
    minUsers: Number,
    nextStepTime: Number
}, { collection: 'tournaments', timestamps: { createdAt: 'created', updatedAt: 'updated' }});
module.exports = models.Tournament || model ('Tournament', tournamentSchema);