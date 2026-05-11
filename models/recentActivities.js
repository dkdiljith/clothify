const mongoose = require(`mongoose`)

const recentActivitySchema = new mongoose.Schema({
    adminId: {
        type: "ObjectId",
        required: true
    },
    activityType: {
        type: "String",
        required: true,
        enum: [
            'product_added',
            'product_edited',
            'product_deleted',
            'category_added',
            'category_edited',
            'category_deleted',
            'coupon_added',
            'coupon_edited',
            'coupon_deleted',
            'offer_added',
            'offer_eligibility_denied',
            'offer_edited',
            'offer_deleted',
            'user_blocked',
            'user_unblocked'
        ]
    },
    description: {
        type: "String",
        required: true
    },
}, { timestamps: true })

module.exports = mongoose.model('Activities', recentActivitySchema);