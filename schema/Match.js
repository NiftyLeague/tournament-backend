const { Schema, model, models } = require ('mongoose');

const matchSchema = new Schema ({
    tournamentId: String,
    isStarted: Boolean,
    home: String,
    away: String
}, { collection: 'matchs', timestamps: { createdAt: 'created', updatedAt: 'updated' }});
module.exports = models.Match || model ('Match', matchSchema);