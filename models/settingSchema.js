const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    settingsType: {
      type: String,
      default: "global_settings",
      unique: true,
      required: true,
      select: false
    },
    referralSettings: {
      coinValue: { type: String, default: "0.010" },
      referrerReward: { type: Number, default: 300 },
      refereeReward: { type: Number, default: 500 },
      signupBonus: { type: Number, default: 1000 },
      referralHoldingPeriodDays: { type: Number, default: 7 }
    }
  },
  { timestamps: true }
);


module.exports = mongoose.model('Settings', settingsSchema);
