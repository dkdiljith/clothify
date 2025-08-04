const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", require: true },
    name:{type:String , required:false},
    streetAddress: {
        type: String,
        required: true,
    },
    landmark: {
        type: String,
    },
    city: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    zip: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
    },
    isDefault:{type:Boolean , default:false}
}, { timestamps: true });


const Address = mongoose.model('Address', addressSchema);

module.exports = Address;