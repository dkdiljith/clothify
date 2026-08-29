// controllers/walletController.js
import * as walletService from '../services/walletService.js';
import WALLET_MESSAGES from '../constants/wallet.js';
import STATUS_CODES from '../constants/status-codes.js';


export const walletRender = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const { wallet, credit, debit, page, limit, totalPages } = await walletService.getWalletDetails(userId, req.query.page);

        return res.status(STATUS_CODES.OK).render('user/wallet', {
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
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(WALLET_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};
 
export const amountDeposit = async (req, res) => {
    try {
        const { amount } = req.body;
        const order = await walletService.createRazorpayDepositOrder(amount);
        return res.status(STATUS_CODES.OK).json(order);
    } catch (error) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const walletPaymentVerification = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const paymentId = await walletService.verifyAndCreditWalletPayment(userId, req.body);
        
        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: WALLET_MESSAGES.PAYMENT_VERIFIED,
            payment_id: paymentId
        });
    } catch (error) {
        const status = error.status || STATUS_CODES.INTERNAL_SERVER_ERROR;
        return res.status(status).send(error.message || WALLET_MESSAGES.FAILED_TO_CREATE_ORDER);
    }
};

export const walletPayment = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = res.locals.user._id;

        await walletService.processWalletPayment(userId, amount);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: WALLET_MESSAGES.PAYMENT_VERIFIED
        });
    } catch (error) {
        if (error.isCustomValidation) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: error.message
            });
        }
        const status = error.status || STATUS_CODES.INTERNAL_SERVER_ERROR;
        return res.status(status).json({ error: error.message });
    }
};