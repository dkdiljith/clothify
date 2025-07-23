const mongoose = require(`mongoose`)

const recentActivitySchema = new mongoose.Schema({
    userId: {
      type: "ObjectId",
    },
    activityType: {
      type: "String",
      required: true,
      enum: [ 
        'order_placed',
        'order_confirmed',
        'order_processing',
        'order_shipped',
        'order_delivered',
        'order_cancelled',
        'order_returned',
        'refund_requested',
        'refund_approved',
        'refund_initiated',
        'refund_completed',
        'refund_rejected',
        'user_registered',
        'user_logged_in',
        'user_logged_out',
        'password_reset_requested',
        'password_reset_successful',
        'profile_updated',
        'address_added',
        'address_updated',
    ]
    },
    description: {
      type: "String",
    },
  }, { timestamps: true })

  module.exports = mongoose.model('Activities', recentActivitySchema);
  