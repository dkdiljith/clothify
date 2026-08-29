// services/walletService.js
import Wallet from '../models/walletSchema.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import WALLET_MESSAGES from '../constants/wallet.js';
import STATUS_CODES from '../constants/status-codes.js';

// Assuming you have order constants, otherwise you can replace ORDER_MESSAGES with strings
const ORDER_MESSAGES = {
    ORDER_LIMIT_EXCEEDED: (limit) => `Orders above ₹${limit} are not allowed. Please reduce your cart total.`,
    INSUFFICIENT_WALLET: "Insufficient balance detected",
    WALLET_DEBIT_DESC: (amount) => `₹${amount} debited for order payment`
};

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID.trim(),
    key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
});

async function createWallet(userId, session = null) {
    try {
        const existingWalletQuery = Wallet.findOne({ userId }).lean();
        if (session) {
            existingWalletQuery.session(session);
        }
        const existingWallet = await existingWalletQuery;
        if (existingWallet) {
            return existingWallet;
        }
        const newWallet = new Wallet({
            userId,
            balance: 0,
            transactions: [],
        });
        const savedWallet = session
            ? await newWallet.save({ session })
            : await newWallet.save();
        return savedWallet;
    } catch (error) {
        if (error.code === 11000) {
            return null;
        }
        throw error;
    }
}

async function getWalletDetails(userId, pageQuery) {
    const wallet = await Wallet.findOne({ userId }).lean();

    const page = parseInt(pageQuery) || 1;
    const limit = 3;
    let totalPages = 0;
    let paginatedTransactions;
    let credit = 0;
    let debit = 0;

    if (wallet) {
        // Clone and reverse transactions to show latest first without mutating original DB array reference
        const reversedTransactions = [...wallet.transactions].reverse();

        totalPages = Math.ceil(reversedTransactions.length / limit);

        const startIndex = (page - 1) * limit;
        paginatedTransactions = reversedTransactions.slice(startIndex, startIndex + limit);

        credit = reversedTransactions.reduce((sum, transaction) => {
            return transaction.type === 'credit' ? sum + transaction.amount : sum;
        }, 0);

        debit = reversedTransactions.reduce((sum, transaction) => {
            return transaction.type === 'debit' ? sum + transaction.amount : sum;
        }, 0);

        wallet.transactions = paginatedTransactions;
    }

    return { wallet, credit, debit, page, limit, totalPages };
}

async function createRazorpayDepositOrder(amount) {
    const integerAmount = parseInt(amount);
    const options = {
        amount: integerAmount * 100, // Razorpay expects paise
        currency: "INR",
        receipt: `wallet_topup_${Date.now()}`
    };
    const order = await razorpay.orders.create(options);
    if (!order) {
        throw new Error(WALLET_MESSAGES.FAILED_TO_CREATE_ORDER);
    }
    return order;
}

async function verifyAndCreditWalletPayment(userId, paymentData) {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = paymentData;
    const integerAmount = parseInt(amount);

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET.trim());
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
        const err = new Error(WALLET_MESSAGES.INVALID_SIGNATURE);
        err.status = STATUS_CODES.BAD_REQUEST; 
        throw err;
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        const err = new Error(WALLET_MESSAGES.NOT_FOUND);
        err.status = STATUS_CODES.NOT_FOUND;
        throw err;
    }

    wallet.balance += integerAmount;
    wallet.transactions.push({
        type: 'credit',
        amount: integerAmount,
        description: WALLET_MESSAGES.WALLET_RECHARGE_DESC(integerAmount, razorpay_payment_id)
    });

    await wallet.save();
    return razorpay_payment_id;
}

async function processWalletPayment(userId, amount) {
    const integerAmount = parseInt(amount);
    const ORDER_LIMIT = 25000;

    if (integerAmount > ORDER_LIMIT) {
        const err = new Error(ORDER_MESSAGES.ORDER_LIMIT_EXCEEDED(ORDER_LIMIT));
        err.isCustomValidation = true;
        throw err;
    }

    if (!userId) {
        const err = new Error(WALLET_MESSAGES.USER_NOT_FOUND);
        err.status = STATUS_CODES.NOT_FOUND;
        throw err;
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        const err = new Error(WALLET_MESSAGES.NOT_FOUND);
        err.status = STATUS_CODES.NOT_FOUND;
        throw err;
    }

    if (wallet.balance < integerAmount) {
        const err = new Error(ORDER_MESSAGES.INSUFFICIENT_WALLET);
        err.status = STATUS_CODES.BAD_REQUEST; 
        throw err;
    }

    wallet.balance -= integerAmount;
    wallet.transactions.push({
        type: "debit",
        amount: integerAmount,
        description: ORDER_MESSAGES.WALLET_DEBIT_DESC(integerAmount),
    });

    const result = await wallet.save();
    if (!result) {
        const err = new Error(WALLET_MESSAGES.WALLET_PAYMENT_FAILED);
        err.status = STATUS_CODES.INTERNAL_SERVER_ERROR;
        throw err;
    }
    return result;
}

export {
    createWallet,
    getWalletDetails,
    createRazorpayDepositOrder,
    verifyAndCreditWalletPayment,
    processWalletPayment
};