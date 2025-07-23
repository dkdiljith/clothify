const Wallet = require(`../models/walletSchema`)
const Razorpay = require(`razorpay`)
const razorpay = new Razorpay({
    key_id: 'rzp_test_TVFPFUZdUa9wz4',
    key_secret: 'JDjqv22uAP27Xw7LkFRelTkH'
});


exports.walletRender = async (req, res) => {
    const userId = req.session.userIsLoggedIn.id;
    const wallet = await Wallet.findOne({ userId }).lean();
    
    // Pagination variables
    const page = parseInt(req.query.page) || 1;
    const limit = 3; // 3 transactions per page
    let totalPages = 0;
    let paginatedTransactions = [];
    let credit = 0;
    let debit = 0;

    if(wallet) {
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

    res.render('user/wallet', { 
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
        }
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
            res.json(order);
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}



//wallet payment verification
exports.walletPaymentVerification = async (req, res) => {
    const userId = req.session.userIsLoggedIn.id;
    const crypto = require('crypto');
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;

    const IntegerAmount = parseInt(amount)

    // Verify payment signature
    const hmac = crypto.createHmac('sha256', 'JDjqv22uAP27Xw7LkFRelTkH');
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === razorpay_signature) {

        // Add funds to wallet
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            res.status(500).send('Wallet notfound');
        }
        wallet.balance += IntegerAmount;

        // Add transaction record
        wallet.transactions.push({
            type: 'credit',
            amount: IntegerAmount,
            description: `Wallet recharge: ₹${IntegerAmount} via Razorpay (ID: ${razorpay_payment_id})`
        });

        await wallet.save();

        res.status(200).json({
            success: true,
            message: 'Payment verified',
            payment_id: razorpay_payment_id
        });
    } else {
        res.status(500).send('Failed to create order');
    }

}


//payment page
exports.walletPayment = async (req, res) => {
    const { amount } = req.body;
    const IntegerAmount = parseInt(amount)

    try {
        const userId = req.session.userIsLoggedIn.id;
        if (!userId) {
            res.status(500).json({ error: `User not found` })
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
            res.status(200).json({
                success: true,
                message: 'Payment verified'
            });
        }
    } catch (err) {
        console.log(err)
    }
}