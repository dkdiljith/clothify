import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    balance: {
        type: Number,
        default: 0,
        required: true,
        min: 0
    },
    transactions: [{
        type: {
            type: String,
            Enum: ["credit", "debit"],
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        description: {
            type: String,
            required: true
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
        },
        createdAt: {
            type: Date,
            default: Date.now,
        }
    }]
})

export default mongoose.model("Wallet", walletSchema)