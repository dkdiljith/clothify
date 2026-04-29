const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    offerCode: { type: String , uppercase: true , required: true },
    offerType:{type:String ,enum: ['subcategory', 'product'], required:true},

     targetIds: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],

    discountType: { type: String, enum: ['percentage', 'price'], required: true },
    discountValue: { type: Number,min: 0 , required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }, 
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);