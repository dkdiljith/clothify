import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    referralCode: { type: String, unique: true, required: true },
    referralCoins: { type: Number, default: 0 },
    firstOrderCompletedAt: { type: Date },
    status: {
        type: String,
        enum: [
            "Pending",
            "Completed",
            "Cancelled"
        ], default: "Pending", required: true
    },
}, { timestamps: true });

referralSchema.index({ referrer: 1, status: 1 });


const Referral = mongoose.model('referral', referralSchema);
export default Referral;
