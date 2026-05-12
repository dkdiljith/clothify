const Coupon = require(`../models/couponSchema`)
const Cart = require(`../models/cartSchema`)

//update cart
const recalculateCartSummary = require(`../services/recalculateCartSummary`)

//update offer & coupon & products
const pricingExpiry = require("../services/pricingExpiry");
const pricingExpiryUpdate = pricingExpiry.pricingExpiryUpdate

//pagination
const adminPaginationFactory = require(`../services/pagination`);

//MESSAGE_CONSTANTS
const MESSAGES = require(`../services/constants`)

/////////////////////////////////////////////////////////////////////////////////////////////////

exports.couponRender = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const query = req.query.query || '';
        const result = await adminPaginationFactory({
            page,
            limit: 5,
            query,
            type: 'coupon'
        });
        return res.render('admin/coupon', {
            admin: true,
            ...result
        });

    } catch (error) {
        
        console.error(error);
        return res.render('admin/coupon', {
            coupon: [],
            admin: true,
            query: '',
            pagination: {},
            errorMessage: "Error fetching coupons"
        });
    }
};


exports.couponEditJson = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.couponId);
        return res.json(coupon);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

















exports.createCoupon = async (req, res) => {
    try {
        const { couponCode, discountType, discountValue, minimumPurchaseAmount, startDate, endDate } = req.body;

        //existence of coupon checking
        if (couponCode) {
            const coupon = await Coupon.find({ couponCode })
            if (coupon) {
                for (let i = 0; i < coupon.length; i++) {
                    if (coupon[i].couponCode === couponCode) {
                        return res.status(500).json({
                            success: false,
                            type: "error",
                            message: "Coupon with same name detected",
                        });
                    }
                }
            }
        }
        const coupon = new Coupon({
            couponCode,
            discountType,
            discountValue,
            minimumPurchaseAmount,
            startDate,
            endDate,
        });

        const result = await coupon.save();
        await pricingExpiryUpdate();

        if (result) {

            return res.status(201).json({
                success: true,
                type: "success",
                message: "Coupon created successfully",
                coupon: result,
            });
        } else {

            return res.status(500).json({
                success: false,
                type: "error",
                message: "Failed to create coupon",
            });
        }
    } catch (err) {
        console.error("Error creating coupon:", err);
        return res.status(500).json({
            success: false,
            type: "error",
            message: "Internal server error",
            error: err.message,
        });
    }
};


exports.couponEdit = async (req, res) => {
    try {
        const couponId = req.params.couponId;
        const { couponCode, discountType, discountValue, minimumPurchaseAmount, startDate, endDate } = req.body;

        //existence of coupon checking
        if (couponCode) {
            const coupon = await Coupon.find({ couponCode })
            if (coupon) {
                for (let i = 0; i < coupon.length; i++) {
                    if (coupon[i].couponCode === couponCode) {
                        const sameCoupon = await Coupon.findById(couponId)
                        if (sameCoupon._id.toString() === coupon[i]._id.toString()) {
                        } else {
                            return res.status(500).json({
                                success: false,
                                type: "error",
                                message: "Coupon with same name detected",
                            });
                        }
                    } else {
                        return res.status(500).json({
                            success: false,
                            type: "error",
                            message: "Coupon with same name detected",
                        });
                    }
                }
            }
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                couponCode,
                discountType,
                discountValue,
                minimumPurchaseAmount,
                startDate,
                endDate,
            },
            { new: true }
        );

        if (updatedCoupon.endDate >= new Date()) {
            updatedCoupon.isActive = true
        }

        const result = updatedCoupon.save()
        await pricingExpiryUpdate();

        if (result) {
            return res.status(200).json({
                success: true,
                type: 'success',
                message: 'Coupon updated successfully',
                coupon: updatedCoupon
            });
        } else {
            return res.status(500).json({
                success: false,
                type: "error",
                message: "Failed to edit coupon",
            });
        }
    } catch (error) {
        console.error('Error updating coupon:', error);
        return res.status(500).json({
            success: false,
            type: "error",
            message: "Internal server error",
            error: err.message,
        });
    }
}



exports.couponDelete = async (req, res) => {
    try {
        const { couponId } = req.params;

        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
        await pricingExpiryUpdate();

        if (deletedCoupon) {
            return res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
        } else {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
    } catch (err) {
        console.error('Error deleting coupon:', err);
        return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
}





//USER SIDE IMPLEMENTATION

exports.applyCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;
        const userId = res.locals.user._id;

        const coupon = await Coupon.findById(couponId);
        if (!coupon || !coupon.isActive || coupon.endDate < new Date()) {
            return res.json({ success: false, message: 'Coupon is not valid' });
        }

        const cart = await Cart.findOne({ userId });
        
        // Use offerAmount or subtotal depending on your business logic
        if (cart.totalAmount < coupon.minimumPurchaseAmount) {
            return res.json({ success: false, message: `Minimum purchase of ₹${coupon.minimumPurchaseAmount} required` });
        }

        cart.couponId = coupon._id;
        await cart.save();

        // Immediately recalculate so the user sees the change
        await recalculateCartSummary(userId);

        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: 'Error applying coupon' });
    }
}


// Remove coupon route
exports.removeCoupon = async (req, res) => {
    try {
        const userId = res.locals.user._id
        const cart = await Cart.findOne({ userId });

        cart.couponId = null;
        cart.couponDiscount = 0;
        await cart.save();

        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: 'Error removing coupon' });
    }
}