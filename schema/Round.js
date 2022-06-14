const { Schema, model, models } = require ('mongoose');
const { roundStatus } = require ('../constants');

const roundSchema = new Schema ({
    status: { type: String, enum: Object.values (roundStatus), default: roundStatus.OPEN },
    tournamentId: String,
    eligibleUserIds: [],
    joinedUserIds: [],
    matchedUserIds: [],
    roundNumber: { type: Number, default: 0 }
}, { collection: 'rounds', timestamps: { createdAt: 'created', updatedAt: 'updated' }});
module.exports = models.Round || model ('Round', roundSchema);