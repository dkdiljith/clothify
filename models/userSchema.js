const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: function () {
            return this.signUpMethod === 'google';
        }
    },
    profileImg: {
        path: String,
        altText: String,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: {
        type: String,
        validate: {
            validator: function (v) {
                return this.googleId || v.length > 0;
            },
            message: 'Password is required for manual sign-up'
        }
    },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, default: null },
    phone: { type: String, default: null },
    blocked: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },

    verificationToken: { type: String, default: null },
    verificationTokenExpires: { type: Date, default: null },
    verificationAttempts: { type: Number, default: 0, min: 0 },
    verificationTimer: { type: Date, default: null },

    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
    resetAttempts: { type: Number, default: 0, min: 0 },
    resetTimer: { type: Date, default: null },

}, { timestamps: true });

const User = mongoose.model("users", userSchema);
module.exports = User;