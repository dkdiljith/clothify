const Offer = require(`../models/offerSchema`)


///////////////////////////////////////////////////////////////////////////////////////////////////////////



exports.offerRender = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 offers per page

        // Get total count of offers
        const totalOffers = await Offer.countDocuments();
        const totalPages = Math.ceil(totalOffers / limit);

        // Get paginated offers (sorted by newest first)
        let offer = await Offer.find()
            .sort({ createdAt: -1 }) // newest first
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();


        return res.render(`admin/offer`, {
            offer,
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
        console.error("Error fetching offers:", error);
        return res.render(`admin/offer`, {
            offer: [],
            admin: true,
            pagination: {
                page: 1,
                limit: 5,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false
            },
            errorMessage: "Error fetching offers. Please try again later."
        });
    }
};







exports.createOffer = async (req, res) => {
    try {
        const {
            offerCode,
            offerType,
            discountType,
            discountValue,
            startDate,
            endDate
        } = req.body;

        console.log('offerCode :', offerCode, 'offerType :', offerType,
            'discountType :', discountType, "discountVaue :", discountValue,
            "startDate :", startDate, "endDate :", endDate
        )


        //existence of offer checking
        if (offerCode) {
            const offer = await Offer.find({ offerCode })
            if (offer) {
                for (let i = 0; i < offer.length; i++) {
                    if (offer[i].offerCode === offerCode) {
                        return res.status(500).json({
                            success: false,
                            type: "error",
                            message: "Offer with same name detected",
                        });
                    }
                }
            }
        }


        // Create the offer
        const offer = new Offer({
            offerCode,
            offerType,
            discountType,
            discountValue,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive: true
        });

        // Save to database
        const savedOffer = await offer.save();


        ////////////////////////////////////////////////////////////////////////////

        // If offer is product-wise, update product prices
        // if (offerType === 'product' && targetIds.length > 0) {
        //     await applyProductOffer(targetIds, discountType, discountValue, savedOffer._id);
        // } else if (offerType === 'subcategory' && targetIds.length > 0) {
        //     await applySubcategoryOffer(targetIds, discountType, discountValue, savedOffer._id)
        // } else if (offerType === 'category' && targetIds.length > 0) {
        //     await applyCategoryOffer(targetIds, discountType, discountValue, savedOffer._id)
        // }

        return res.status(201).json({
            success: true,
            type: "success",
            message: "Offer created successfully",
            offer: savedOffer
        });


    } catch (err) {
        console.error("Error creating offer:", err);

        // Generic error handler
        return res.status(500).json({
            success: false,
            type: "error",
            message: "Internal server error",
            error: err.message
        });
    }
};




exports.offerEditJson = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.offerId);
        return res.json(offer);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}




exports.editOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const {
            offerCode,
            offerType,
            discountType,
            discountValue,
            startDate,
            endDate,
        } = req.body;


        //existence of offer checking
        if (offerCode) {
            const offer = await Offer.find({ offerCode })
            if (offer) {
                for (let i = 0; i < offer.length; i++) {
                    if (offer[i].offerCode === offerCode) {
                        const sameOffer = await Offer.findById(offerId)
                        if (sameOffer._id.toString() === offer[i]._id.toString()) {
                        } else {
                            return res.status(500).json({
                                success: false,
                                type: "error",
                                message: "Offer with same name detected",
                            });
                        }
                    } else {
                        return res.status(500).json({
                            success: false,
                            type: "error",
                            message: "Offer with same name detected",
                        });
                    }
                }
            }
        }


        // Find the existing offer
        const existingOffer = await Offer.findById(offerId);
        if (!existingOffer) {
            return res.status(404).json({
                success: false,
                type: "error",
                message: "Offer not found"
            });
        }

        // Update only the fields that were provided
        if (offerCode !== undefined) {
            existingOffer.offerCode = offerCode.toUpperCase();
        }

        // Update other fields if provided
        if (discountType !== undefined) existingOffer.discountType = discountType;
        if (discountValue !== undefined) existingOffer.discountValue = Number(discountValue);
        if (startDate !== undefined) existingOffer.endDate = new Date(startDate);
        if (endDate !== undefined) existingOffer.endDate = new Date(endDate);

        // Validate the updated offer
        await existingOffer.validate();

        // Save the updated offer
        const updatedOffer = await existingOffer.save();

        return res.status(200).json({
            success: true,
            type: "success",
            message: "Offer updated successfully",
            offer: updatedOffer
        });

    } catch (err) {
        console.error("Error updating offer:", err);

        // Generic error handler
        return res.status(500).json({
            success: false,
            type: "error",
            message: "Internal server error",
            error: err.message
        });
    }
};






exports.offerDelete = async (req, res) => {
    try {
        const { offerId } = req.params;
        console.log("this is offerId :", offerId)

        // delete the offer
        const deletedOffer = await Offer.findByIdAndDelete(offerId);

        if (!deletedOffer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Offer deleted successfully',
        });

    } catch (err) {
        console.error('Error deleting offer:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
};
