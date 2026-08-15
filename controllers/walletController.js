const walletService = require("../services/walletService");

exports.walletRender = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const { wallet, credit, debit, page, limit, totalPages } = await walletService.getWalletDetails(userId, req.query.page);

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
    } catch (error) {
        return res.status(500).send("Internal Server Error");
    }
};

exports.amountDeposit = async (req, res) => {
    try {
        const { amount } = req.body;
        const order = await walletService.createRazorpayDepositOrder(amount);
        return res.json(order);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.walletPaymentVerification = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const paymentId = await walletService.verifyAndCreditWalletPayment(userId, req.body);
        
        return res.status(200).json({
            success: true,
            message: 'Payment verified',
            payment_id: paymentId
        });
    } catch (error) {
        const status = error.status || 500;
        return res.status(status).send(error.message || 'Failed to create order');
    }
};

exports.walletPayment = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = res.locals.user._id;

        await walletService.processWalletPayment(userId, amount);

        return res.status(200).json({
            success: true,
            message: 'Payment verified'
        });
    } catch (error) {
        if (error.isCustomValidation) {
            return res.json({
                success: false,
                message: error.message
            });
        }
        const status = error.status || 500;
        return res.status(status).json({ error: error.message });
    }
};