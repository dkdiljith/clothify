const Coupon = require(`../models/couponSchema`)
const Cart = require(`../models/cartSchema`)



exports.couponRender = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 coupons per page

        // Get total count of coupons
        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit);

        // Get paginated coupons (newest first)
        const coupons = await Coupon.find()
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        res.render('admin/coupon', {
            coupon: coupons,
            admin: true,
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

    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.render('admin/coupon', {
            coupon: [],
            admin: true,
            pagination: {
                page: 1,
                limit: 5,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false
            },
            errorMessage: "Error fetching coupons. Please try again later."
        });
    }
};

















exports.createCoupon = async (req, res) => {
    try {
        const { couponCode, discountType, discountValue, minimumPurchaseAmount, endDate } = req.body;

        const coupon = new Coupon({
            couponCode,
            discountType,
            discountValue,
            minimumPurchaseAmount,
            endDate,
        });

        const result = await coupon.save();

        if (result) {

            res.status(201).json({
                success: true,
                type: "success",
                message: "Coupon created successfully",
                coupon: result,
            });
        } else {

            res.status(500).json({
                success: false,
                type: "error",
                message: "Failed to create coupon",
            });
        }
    } catch (err) {
        console.error("Error creating coupon:", err);
        res.status(500).json({
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
        const { couponCode, discountType, discountValue, minimumPurchaseAmount, endDate } = req.body;

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                couponCode,
                discountType,
                discountValue,
                minimumPurchaseAmount,
                endDate,
            },
            { new: true }
        );

        if(updatedCoupon.endDate >= new Date()){
            updatedCoupon.isActive = true
        }

        const result = updatedCoupon.save()

        if (result) {
            res.status(200).json({
                success: true,
                type: 'success',
                message: 'Coupon updated successfully',
                coupon: updatedCoupon
            });
        } else {
             res.status(500).json({
                success: false,
                type: "error",
                message: "Failed to edit coupon",
            });
        }
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({
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

        if (deletedCoupon) {
            res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Coupon not found' });
        }
    } catch (err) {
        console.error('Error deleting coupon:', err);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
}





//USER SIDE IMPLEMENTATION

exports.applyCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;
        const userId = res.locals.user._id

        // Find the coupon
        const coupon = await Coupon.findById(couponId);
        if (!coupon || !coupon.isActive || coupon.endDate < new Date()) {
            return res.json({ success: false, message: 'Coupon is not valid' });
        }

        // Check minimum purchase
        const cart = await Cart.findOne({ userId });
        if (cart.subtotal < coupon.minimumPurchaseAmount) {
            return res.json({ success: false, message: `Minimum purchase of ₹${coupon.minimumPurchaseAmount} required` });
        }

        // Calculate discount
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (cart.subtotal * coupon.discountValue) / 100;
        } else {
            discount = coupon.discountValue
        }

        // Update cart
        cart.couponId = coupon._id;
        cart.couponDiscount = discount;

        await cart.save();

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Error applying coupon' });
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

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Error removing coupon' });
    }
}