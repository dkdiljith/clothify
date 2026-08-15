const Wallet = require("../models/walletSchema");
const Razorpay = require("razorpay");
const crypto = require("crypto");

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
    let paginatedTransactions = [];
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
        throw new Error("Failed to create order");
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
        const err = new Error("Invalid signature");
        err.status = 500;
        throw err;
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        const err = new Error("Wallet not found");
        err.status = 500;
        throw err;
    }

    wallet.balance += integerAmount;
    wallet.transactions.push({
        type: 'credit',
        amount: integerAmount,
        description: `Wallet recharge: ₹${integerAmount} via Razorpay (ID: ${razorpay_payment_id})`
    });

    await wallet.save();
    return razorpay_payment_id;
}

async function processWalletPayment(userId, amount) {
    const integerAmount = parseInt(amount);
    const ORDER_LIMIT = 25000;

    if (integerAmount > ORDER_LIMIT) {
        const err = new Error(`Orders above ₹${ORDER_LIMIT} are not allowed. Please reduce your cart total.`);
        err.isCustomValidation = true;
        throw err;
    }

    if (!userId) {
        const err = new Error("User not found");
        err.status = 500;
        throw err;
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        const err = new Error("Wallet not found");
        err.status = 500;
        throw err;
    }

    if (wallet.balance < integerAmount) {
        const err = new Error("Insufficient balance detected");
        err.status = 500;
        throw err;
    }

    wallet.balance -= integerAmount;
    wallet.transactions.push({
        type: "debit",
        amount: integerAmount,
        description: `₹${integerAmount} debited for order payment`,
    });

    const result = await wallet.save();
    if (!result) {
        const err = new Error("Failed to process wallet payment");
        err.status = 500;
        throw err;
    }
    return result;
}

module.exports = {
    createWallet,
    getWalletDetails,
    createRazorpayDepositOrder,
    verifyAndCreditWalletPayment,
    processWalletPayment
};