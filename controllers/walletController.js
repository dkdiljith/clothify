const Wallet = require(`../models/walletSchema`)
const Razorpay = require(`razorpay`)

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID.trim(),
    key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
});


//MESSAGE_CONSTANTS
// const MESSAGES = require(`../utils/constants`)


////////////////////////////////////////////////////////////////////////////////////////////

exports.createWallet = async (userId, session = null) => {
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
    }
};




exports.walletRender = async (req, res) => {
    const userId = res.locals.user._id
    const wallet = await Wallet.findOne({ userId }).lean();

    // Pagination variables
    const page = parseInt(req.query.page) || 1;
    const limit = 3; // 3 transactions per page
    let totalPages = 0;
    let paginatedTransactions
    let credit = 0;
    let debit = 0;

    if (wallet) {
        // Reverse transactions to show latest first
        const reversedTransactions = wallet.transactions.reverse();

        // Calculate total pages
        totalPages = Math.ceil(reversedTransactions.length / limit);

        // Get transactions for current page
        const startIndex = (page - 1) * limit;
        paginatedTransactions = reversedTransactions.slice(startIndex, startIndex + limit);

        // Calculate credit and debit totals
        credit = reversedTransactions.reduce((sum, transaction) => {
            return transaction.type === 'credit' ? sum + transaction.amount : sum;
        }, 0);

        debit = reversedTransactions.reduce((sum, transaction) => {
            return transaction.type === 'debit' ? sum + transaction.amount : sum;
        }, 0);

        // Update wallet object with paginated transactions
        wallet.transactions = paginatedTransactions;
    }

    return res.render('user/wallet', {
        wallet,
        credit,
        debit,
        pagination: {
            page,
            limit,
            totalPages,
            nextPage: page + 1,
            prevPage: page - 1,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        },
        user_sidebar: true
    });
};



//wallet page amount deposit
exports.amountDeposit = async (req, res) => {
    try {
        const { amount } = req.body;
        const IntegerAmount = parseInt(amount)

        // Create Razorpay order
        const options = {
            amount: IntegerAmount * 100, // Razorpay expects amount in paise
            currency: "INR",
            receipt: `wallet_topup_${Date.now()}`
        };
        const order = await razorpay.orders.create(options);

        if (order) {
            return res.json(order);
        }

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}



//wallet payment verification
exports.walletPaymentVerification = async (req, res) => {
    const userId = res.locals.user._id
    const crypto = require('crypto');
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;

    const IntegerAmount = parseInt(amount)

    // Verify payment signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET.trim());
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === razorpay_signature) {

        // Add funds to wallet
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(500).send('Wallet notfound');
        }
        wallet.balance += IntegerAmount;

        // Add transaction record
        wallet.transactions.push({
            type: 'credit',
            amount: IntegerAmount,
            description: `Wallet recharge: ₹${IntegerAmount} via Razorpay (ID: ${razorpay_payment_id})`
        });

        await wallet.save();

        return res.status(200).json({
            success: true,
            message: 'Payment verified',
            payment_id: razorpay_payment_id
        });
    } else {
        return res.status(500).send('Failed to create order');
    }

}


//payment page
exports.walletPayment = async (req, res) => {
    const { amount } = req.body;
    const IntegerAmount = parseInt(amount)

    // 25,000 limit 
    const ORDER_LIMIT = 25000;
    if (amount > ORDER_LIMIT) {
        return res.json({
            success: false,
            message: `Orders above ₹${ORDER_LIMIT} are not allowed. Please reduce your cart total.`
        });
    }

    const userId = res.locals.user._id
    if (!userId) {
        return res.status(500).json({ error: `User not found` })
    }

    const wallet = await Wallet.findOne({ userId })
    if (!wallet) {
        return res.status(500).json({ error: `Wallet not found` })
    }

    if (wallet.balance < IntegerAmount) {
        return res.status(500).json({ error: `Insuffecient balance detected` })
    }
    wallet.balance -= IntegerAmount;
    wallet.transactions.push({
        type: "debit",
        amount: IntegerAmount,
        description: `₹${IntegerAmount} debited for order payment`,
    });
    const result = await wallet.save();

    if (result) {
        return res.status(200).json({
            success: true,
            message: 'Payment verified'
        });
    }
}