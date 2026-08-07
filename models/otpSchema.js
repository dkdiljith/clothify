const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        purpose: {
            type: String,
            enum: [
                "RESET_EMAIL",
                "FORGOT_PASSWORD",
                "EMAIL_VERIFICATION",
            ],
            required: true,
        },
        otpHash: { type: String, required: true, },
        resendCount: { type: Number, default: 0, min: 0 },
        attempts: { type: Number, default: 0, min: 0, },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true },
);

//  Automatically delete document 24 hours after 'createdAt'
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });
// Only one active OTP per user & purpose
otpSchema.index({ userId: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model("Otp", otpSchema);
