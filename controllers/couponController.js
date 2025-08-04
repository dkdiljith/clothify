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

        return res.render('admin/coupon', {
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
        return res.render('admin/coupon', {
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
        const { couponCode, discountType, discountValue, minimumPurchaseAmount, endDate } = req.body;

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
            endDate,
        });

        const result = await coupon.save();

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
        const { couponCode, discountType, discountValue, minimumPurchaseAmount, endDate } = req.body;

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
                endDate,
            },
            { new: true }
        );

        if (updatedCoupon.endDate >= new Date()) {
            updatedCoupon.isActive = true
        }

        const result = updatedCoupon.save()

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