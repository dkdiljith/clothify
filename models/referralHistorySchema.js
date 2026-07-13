const mongoose = require('mongoose');


const referralHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    coins: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true });


referralHistorySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('referralHistory', referralHistorySchema);

