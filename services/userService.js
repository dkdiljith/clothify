// services/userService.js
import User from '../models/userSchema.js';
import Product from '../models/productSchema.js';
import Settings from '../models/settingSchema.js';
import Wishlist from '../models/wishListSchema.js';
import Otp from '../models/otpSchema.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import AUTH_MESSAGES from '../constants/auth.js';

import { 
  verificationEmailSend, 
  passwordResetEmailSend as forgotPasswordEmailSend, 
  sendPasswordChangedEmail 
} from '../utils/nodemailer.js';

import { createWallet } from '../services/walletService.js';
import { createReferral } from '../controllers/referralController.js';

// --- Security & Utility Functions ---

const securePassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const generateOtp = () => {
    const otp = crypto.randomInt(100000, 1000000).toString();
    return { otp };
};

const hashOtp = (otp) => {
    const OTP_PEPPER = process.env.OTP_HASH_SECRET;
    return crypto.createHmac('sha256', OTP_PEPPER).update(otp).digest('hex');
};

const verifyOtp = (otp, storedOtp) => {
    const submittedHash = hashOtp(otp);
    const submittedBuffer = Buffer.from(submittedHash, 'hex');
    const storedBuffer = Buffer.from(storedOtp, 'hex');

    if (submittedBuffer.length !== storedBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(submittedBuffer, storedBuffer);
};

const validateAndCleanEmail = (email) => {
    if (!email || typeof email !== 'string') return null;
    let cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) return null;

    const parts = cleanEmail.split('@');
    if (parts.length !== 2) return null;
    const domain = parts[1];
    if (domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-') || domain.endsWith('-')) return null;
    
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return null;
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) return null;

    return cleanEmail;
};

// --- Service Operations ---

const getHomeData = async (userId) => {
    const [products, settings, wishlist] = await Promise.all([
        Product.find().limit(8).lean(),
        Settings.findOne({ settingsType: "global_settings" }).lean(),
        userId ? Wishlist.findOne({ userId }).lean() : null,
    ]);

    if (wishlist?.items) {
        const wishlistSet = new Set(wishlist.items.map(item => item.productId.toString()));
        products.forEach(product => {
            product.isWishlisted = wishlistSet.has(product._id.toString());
        });
    }

    const referralSettings = settings?.referralSettings || {
        coinValue: "0.010",
        referrerReward: 300,
        refereeReward: 500,
        signupBonus: 1000,
        referralHoldingPeriodDays: 7,
    };

    return { products, referralSettings };
};

const loginUser = async (email, password) => {
    const user = await User.findOne({ email }).lean();
    if (!user) throw new Error(AUTH_MESSAGES.USER_NOT_FOUND);
    if (!user.password) throw new Error(AUTH_MESSAGES.TRY_FORGOT_PASSWORD);

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) throw new Error(AUTH_MESSAGES.INVALID_CREDENTIALS);
    if (!user.isVerified) throw new Error(AUTH_MESSAGES.USER_NOT_VERIFIED);
    if (user.blocked) throw new Error(AUTH_MESSAGES.USER_BLOCKED);

    await createWallet(user._id);
    await createReferral(user._id);

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        blocked: user.blocked
    };
};

const registerUserProcess = async (name, email, password) => {
    const validatedEmail = validateAndCleanEmail(email);
    if (!validatedEmail) throw new Error(AUTH_MESSAGES.INVALID_EMAIL_FORMAT);

    const otpPurpose = "EMAIL_VERIFICATION";
    let user = await User.findOne({ email: validatedEmail }).lean();
    if (user?.isVerified) throw new Error(AUTH_MESSAGES.ACCOUNT_EXIST);

    if (user) {
        const existingOtp = await Otp.findOne({ userId: user._id, purpose: otpPurpose }).lean();
        if (existingOtp?.resendCount >= 3) throw new Error(AUTH_MESSAGES.OTP_RESEND_LIMIT_EXCEEDED);
        if (existingOtp && (Date.now() - existingOtp.updatedAt.getTime() < 5000)) {
            throw new Error(AUTH_MESSAGES.OTP_RESENT_WAIT);
        }
    }

    const passwordHash = await securePassword(password);
    const { otp } = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    if (!user) {
        user = await User.findOneAndUpdate(
            { email: validatedEmail },
            {
                $setOnInsert: {
                    name: name.trim(),
                    email: validatedEmail,
                    password: passwordHash,
                    isVerified: false
                }
            },
            { upsert: true, new: true, lean: true }
        );
    }

    const updateResult = await Otp.updateOne(
        { userId: user._id, purpose: otpPurpose },
        { $set: { otpHash, attempts: 0, expiresAt }, $inc: { resendCount: 1 } },
        { upsert: false }
    );

    if (updateResult.matchedCount === 0) {
        await Otp.updateOne(
            { userId: user._id, purpose: otpPurpose },
            { $set: { otpHash, attempts: 0, expiresAt }, $setOnInsert: { resendCount: 0 } },
            { upsert: true }
        );
    }

    await verificationEmailSend(validatedEmail, otp);

    return {
        _id: user._id.toString(),
        email: validatedEmail,
        otpExpiresAt: expiresAt.toISOString(),
        resendAvailableAt: new Date(Date.now() + 60000).toISOString()
    };
};

const resendEmailVerificationProcess = async (sessionUser) => {
    const otpPurpose = "EMAIL_VERIFICATION";
    const validatedEmail = validateAndCleanEmail(sessionUser.email);
    const user = await User.findById(sessionUser._id).lean();
    if (!user) throw new Error(AUTH_MESSAGES.SESSION_EXPIRED_REGISTER);

    const existingOtp = await Otp.findOne({ userId: user._id, purpose: otpPurpose }).lean();
    if (!existingOtp) throw new Error(AUTH_MESSAGES.VERIFICATION_SESSION_NOT_FOUND);
    if (existingOtp.resendCount >= 3) throw new Error(AUTH_MESSAGES.OTP_RESEND_LIMIT_EXCEEDED);
    if (Date.now() - existingOtp.updatedAt.getTime() < 5000) throw new Error(AUTH_MESSAGES.OTP_RESENT_WAIT);

    const { otp } = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + (15 * 60 * 1000));
    const resendAvailableAt = new Date(Date.now() + (60 * 1000));

    await Otp.updateOne(
        { userId: user._id, purpose: otpPurpose },
        { $set: { otpHash, attempts: 0, expiresAt }, $inc: { resendCount: 1 } }
    );

    await verificationEmailSend(validatedEmail, otp);

    return {
        otpExpiresAt: expiresAt.toISOString(),
        resendTimer: resendAvailableAt.toISOString()
    };
};

const verifyEmailOtpProcess = async (userId, verificationCode) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const otpPurpose = "EMAIL_VERIFICATION";
        const user = await User.findById(userId).select("_id name email blocked isVerified").lean().session(session);
        if (!user) throw new Error(AUTH_MESSAGES.USER_NOT_FOUND);
        if (user.isVerified) throw new Error(AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED);

        const existingOtp = await Otp.findOne({ userId, purpose: otpPurpose }).lean().session(session);
        if (!existingOtp) throw new Error(AUTH_MESSAGES.NO_ACTIVE_VERIFICATION);
        if (Date.now() > existingOtp.expiresAt.getTime()) throw new Error(AUTH_MESSAGES.VERIFICATION_EXPIRED);
        if (existingOtp.attempts >= 5) throw new Error(AUTH_MESSAGES.MAX_ATTEMPTS_REACHED);

        const isMatch = verifyOtp(verificationCode, existingOtp.otpHash);
        if (!isMatch) {
            await Otp.updateOne({ _id: existingOtp._id }, { $inc: { attempts: 1 } }).session(session);
            await session.commitTransaction();
            throw new Error(AUTH_MESSAGES.INVALID_VERIFICATION_CODE);
        }

        await User.updateOne({ _id: userId }, { $set: { isVerified: true } }).session(session);
        await Otp.deleteOne({ _id: existingOtp._id }).session(session);

        const wallet = await createWallet(userId, session);
        if (!wallet) throw new Error("Unable to create wallet.");

        const referral = await createReferral(userId, session);
        if (!referral) throw new Error("Unable to create referral.");

        await session.commitTransaction();
        return user;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
};

const forgetPasswordProcess = async (email) => {
    const validatedEmail = validateAndCleanEmail(email);
    if (!validatedEmail) throw new Error(AUTH_MESSAGES.EMAIL_REQUIRED);

    const otpPurpose = "FORGOT_PASSWORD";
    const user = await User.findOne({ email: validatedEmail }).lean();
    if (!user) throw new Error(AUTH_MESSAGES.USER_NOT_FOUND);

    const existingOtp = await Otp.findOne({ userId: user._id, purpose: otpPurpose }).lean();
    if (existingOtp) {
        if (existingOtp.resendCount >= 3) throw new Error(AUTH_MESSAGES.OTP_RESEND_LIMIT_EXCEEDED);
        if (Date.now() - existingOtp.updatedAt.getTime() < 5000) throw new Error(AUTH_MESSAGES.OTP_RESENT_WAIT);
    }

    const { otp } = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const resendAvailableAt = new Date(Date.now() + 60 * 1000);

    if (existingOtp) {
        await Otp.updateOne({ _id: existingOtp._id }, { $set: { otpHash, attempts: 0, expiresAt }, $inc: { resendCount: 1 } });
    } else {
        await Otp.create({ userId: user._id, purpose: otpPurpose, otpHash, attempts: 0, resendCount: 0, expiresAt });
    }

    await forgotPasswordEmailSend(validatedEmail, otp);

    return {
        _id: user._id.toString(),
        email: validatedEmail,
        otpExpiresAt: expiresAt.toISOString(),
        resendAvailableAt: resendAvailableAt.toISOString(),
    };
};

const validateResetPasswordTokenProcess = async (userId, otp) => {
    const otpPurpose = "FORGOT_PASSWORD";
    const user = await User.findById(userId).lean();
    if (!user) throw new Error(AUTH_MESSAGES.USER_NOT_FOUND);

    const existingOtp = await Otp.findOne({ userId, purpose: otpPurpose }).lean();
    if (!existingOtp) throw new Error("otpNotFound");

    const increaseAttempts = async () => {
        await Otp.updateOne({ _id: existingOtp._id }, { $inc: { attempts: 1 } });
    };

    if (Date.now() > existingOtp.expiresAt.getTime()) {
        await increaseAttempts();
        throw new Error(AUTH_MESSAGES.VERIFICATION_EXPIRED);
    }
    if (existingOtp.attempts >= 5) {
        throw new Error(AUTH_MESSAGES.MAX_ATTEMPTS_REACHED);
    }

    const isValidOtp = verifyOtp(otp, existingOtp.otpHash);
    if (!isValidOtp) {
        await increaseAttempts();
        throw new Error(AUTH_MESSAGES.INVALID_VERIFICATION_CODE);
    }

    await increaseAttempts();
};

const resetPasswordProcess = async (userId, newPassword, confirmPassword) => {
    if (!newPassword || !confirmPassword) throw new Error(AUTH_MESSAGES.ALL_FIELDS_REQUIRED);
    if (newPassword !== confirmPassword) throw new Error(AUTH_MESSAGES.PASSWORDS_DONT_MATCH);

    const user = await User.findById(userId).lean();
    if (!user) throw new Error(AUTH_MESSAGES.USER_NOT_FOUND);

    if (user.password) {
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) throw new Error(AUTH_MESSAGES.SAME_PASSWORD_ERROR);
    }

    const passwordHash = await securePassword(newPassword);
    await User.updateOne({ _id: userId }, { $set: { password: passwordHash } });

    await Otp.updateOne(
        { userId, purpose: "FORGOT_PASSWORD" },
        { $set: { otpHash: "", attempts: 4, resendCount: 4 } }
    );

    await sendPasswordChangedEmail(user.email);
};

const fetchPaginatedUsers = async (query, accountStatus, page) => {
    const limit = 5;
    const skip = (page - 1) * limit;
    const filter = {};

    if (query) {
        filter.$or = [
            { name: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
            { phone: { $regex: query, $options: "i" } }
        ];
    }
    if (accountStatus === "blocked") filter.blocked = true;
    if (accountStatus === "active") filter.blocked = false;

    const [user, totalDocuments] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalDocuments / limit);
    return {
        user,
        pagination: {
            page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            serialNumberStart: skip
        }
    };
};

const toggleUserBlockStatus = async (userId) => {
    await User.updateOne({ _id: userId }, [{ $set: { blocked: { $not: "$blocked" } } }]);
};

const verifyUserPasswordProcess = async (userId, password) => {
    const user = await User.findById(userId).lean();
    if (!user.password && user.googleId) throw new Error(AUTH_MESSAGES.GOOGLE_LOGIN_DETECTED);

    const result = await bcrypt.compare(password, user.password);
    if (!result) throw new Error(AUTH_MESSAGES.INVALID_PASSWORD);
};

const verifyEmailChangeProcess = async (userId, email) => {
    const validatedEmail = validateAndCleanEmail(email);
    if (!validatedEmail) throw new Error(AUTH_MESSAGES.VALID_EMAIL_REQUIRED);

    const currentPurpose = "RESET_EMAIL";
    const existingOtp = await Otp.findOne({ userId, purpose: currentPurpose }).lean();
    if (existingOtp?.resendCount >= 3) throw new Error(AUTH_MESSAGES.OTP_RESEND_LIMIT_EXCEEDED);

    const anyone = await User.findOne({ email: validatedEmail }).lean();
    if (anyone) throw new Error(AUTH_MESSAGES.ACCOUNT_EXIST);

    const { otp } = generateOtp();

    if (existingOtp) {
        await Otp.updateOne(
            { _id: existingOtp._id },
            {
                $set: { otpHash: hashOtp(otp), attempts: 0, expiresAt: new Date(Date.now() + (15 * 60 * 1000)) },
                $inc: { resendCount: 1 }
            }
        );
    } else {
        const verificationDocument = new Otp({
            userId,
            purpose: "RESET_EMAIL",
            otpHash: hashOtp(otp),
            resendCount: 0,
            attempts: 0,
            expiresAt: new Date(Date.now() + (5 * 60 * 1000))
        });
        await verificationDocument.save();
    }

    await verificationEmailSend(validatedEmail, otp);
};

const resetEmailProcess = async (userId, email, otp) => {
    const validatedEmail = validateAndCleanEmail(email);
    if (!validatedEmail) throw new Error(AUTH_MESSAGES.VALID_EMAIL_REQUIRED);
    if (!otp) throw new Error(AUTH_MESSAGES.NO_OTP_DETECTED);

    const currentPurpose = "RESET_EMAIL";
    const existingOtp = await Otp.findOne({ userId, purpose: currentPurpose }).lean();
    if (!existingOtp) throw new Error(AUTH_MESSAGES.NO_ACTIVE_OTP);

    if (Date.now() > existingOtp.expiresAt.getTime()) {
        throw new Error(AUTH_MESSAGES.VERIFICATION_EXPIRED);
    }
    if (existingOtp.attempts >= 5) {
        throw new Error(AUTH_MESSAGES.MAX_ATTEMPTS_REACHED);
    }

    const isMatch = verifyOtp(otp, existingOtp.otpHash);
    if (!isMatch) {
        await Otp.updateOne({ _id: existingOtp._id }, { $inc: { attempts: 1 } });
        throw new Error(AUTH_MESSAGES.INVALID_VERIFICATION_CODE);
    }

    const duplicateEmailUser = await User.findOne({ email: validatedEmail, _id: { $ne: userId } }).lean();
    if (duplicateEmailUser) throw new Error(AUTH_MESSAGES.ACCOUNT_EXIST);

    await User.updateOne({ _id: userId }, { $set: { email: validatedEmail } });

    await Otp.updateOne(
        { _id: existingOtp._id },
        { $set: { otpHash: "", attempts: 4, resendCount: 4 } }
    );
};

export {
    getHomeData,
    loginUser,
    registerUserProcess,
    resendEmailVerificationProcess,
    verifyEmailOtpProcess,
    forgetPasswordProcess,
    validateResetPasswordTokenProcess,
    resetPasswordProcess,
    fetchPaginatedUsers,
    toggleUserBlockStatus,
    verifyUserPasswordProcess,
    verifyEmailChangeProcess,
    resetEmailProcess
};