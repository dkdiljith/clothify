const Offer = require(`../models/offerSchema`)
const Category = require(`../models/categorySchema`)
const Product = require(`../models/productSchema`);



// Helper function to update product discount prices with offer reference in details -- products
async function updateProductPrices(productIds, discountType, discountValue, offerId) {
    try {
        const products = await Product.find({ _id: { $in: productIds } });

        const updateOperations = products.map(product => {

            const updatedDetails = product.details.map(detail => {
                let calculatedDiscountPrice = 0;

                if (discountType === 'percentage') {
                    calculatedDiscountPrice = Math.round(detail.price * (discountValue / 100));
                } else if (discountType === 'price') {
                    calculatedDiscountPrice = Math.round(discountValue);
                }


                // calculatedDiscountPrice = Math.min(calculatedDiscountPrice, detail.price);
                if (calculatedDiscountPrice >= detail.price) {
                    console.log(`cannot add discount price for the product ${product.name} , of id: ${product._id}. discountprice is greater than Actual price , so no discount is being added here !`)
                    calculatedDiscountPrice = 0
                    offerId = null
                }


                return {
                    ...detail.toObject(),
                    discountPrice: calculatedDiscountPrice,
                    currentOffer: offerId
                };
            });


            return Product.updateOne(
                { _id: product._id },
                {
                    $set: {
                        details: updatedDetails,
                    }
                }
            );
        });

        await Promise.all(updateOperations);
    } catch (err) {
        console.error("Error updating product prices:", err);
        throw err;
    }
}









// Helper function to update product discount prices with offer reference in details  --  subcategory
async function applySubcategoryOffer(subcategoryIds, discountType, discountValue, offerId) {
    try {
        const products = await Product.find({ categoryId: { $in: subcategoryIds } });

        // 2. Prepare bulk update operations for better performance
        const bulkOps = products.map(product => {
            const updatedDetails = product.details.map(detail => {
                let calculatedDiscountPrice = 0;

                if (discountType === 'percentage') {
                    calculatedDiscountPrice = Math.round(detail.price * (discountValue / 100));
                } else if (discountType === 'price') {
                    calculatedDiscountPrice = Math.round(discountValue);
                }

                // calculatedDiscountPrice = Math.min(calculatedDiscountPrice, detail.price);
                if (calculatedDiscountPrice >= detail.price) {
                    console.log(`cannot add discount price for the product ${product.name} , of id: ${product._id}. discountprice is greater than Actual price , so no discount is being added here !`)
                    calculatedDiscountPrice = 0
                    offerId = null
                }

                return {
                    ...detail.toObject(),
                    discountPrice: calculatedDiscountPrice,
                    currentOffer: offerId
                };
            });


            return {
                updateOne: {
                    filter: { _id: product._id },
                    update: {
                        $set: {
                            details: updatedDetails,
                        }
                    }
                }
            };
        });

        // 3. Execute bulk update if there are products to update
        if (bulkOps.length > 0) {
            await Product.bulkWrite(bulkOps);
        }

        return {
            success: true,
            message: `Offer applied to ${bulkOps.length} products`,
            affectedProducts: bulkOps.length
        };

    } catch (err) {
        console.error("Error applying subcategory offer:", err);
        throw err;
    }
}







// Helper function to update product discount prices with offer reference in details  --  category
async function applyCategoryOffer(categoryId, discountType, discountValue, offerId) {
    try {

        const subcategories = await Category.find({
            parentCategory: categoryId
        }).select('_id');

        const subcategoryIds = subcategories.map(sub => sub._id);

        if (subcategoryIds.length === 0) {
            return {
                success: false,
                message: "No subcategories found for this category"
            };
        }


        const products = await Product.find({
            categoryId: { $in: subcategoryIds }
        });


        const bulkOps = products.map(product => {
            const updatedDetails = product.details.map(detail => {
                let calculatedDiscountPrice = 0;

                if (discountType === 'percentage') {
                    calculatedDiscountPrice = Math.round(detail.price * (discountValue / 100));
                } else if (discountType === 'price') {
                    calculatedDiscountPrice = Math.round(discountValue);
                }


                // calculatedDiscountPrice = Math.min(calculatedDiscountPrice, detail.price);
                if (calculatedDiscountPrice >= detail.price) {
                    console.log(`cannot add discount price for the product ${product.name} , of id: ${product._id}. discountprice is greater than Actual price , so no discount is being added here !`)
                    calculatedDiscountPrice = 0
                    offerId = null
                }

                return {
                    ...detail.toObject(), // Preserve all fields
                    discountPrice: calculatedDiscountPrice,
                    currentOffer: offerId
                };
            });

            const hasActiveDiscount = updatedDetails.some(detail => detail.discountPrice > 0);

            return {
                updateOne: {
                    filter: { _id: product._id },
                    update: {
                        $set: {
                            details: updatedDetails,
                            hasDiscount: hasActiveDiscount
                        }
                    }
                }
            };
        });

        if (bulkOps.length > 0) {
            await Product.bulkWrite(bulkOps);
            return {
                success: true,
                message: `Offer applied to ${bulkOps.length} products across ${subcategoryIds.length} subcategories`,
                affectedProducts: bulkOps.length,
                affectedSubcategories: subcategoryIds.length
            };
        }

        return {
            success: true,
            message: "No products found in these subcategories",
            affectedProducts: 0,
            affectedSubcategories: subcategoryIds.length
        };

    } catch (err) {
        console.error("Error applying category offer:", err);
        throw err;
    }
}



///////////////////////////////////////////////////////////////////////////////////////////////////////////



exports.offerRender = async (req, res) => {
    const offer = await Offer.find().lean()
    const product = await Product.find().lean()

    if (offer) {
        for (let i = 0; i < offer.length / 2; i++) {
            let temp = offer[i]
            offer[i] = offer[offer.length - 1 - i]
            offer[offer.length - 1 - i] = temp
        }
    }

    const categories = await Category.find().lean()
    const groupedCategories = categories
        .filter(cat => !cat.parentCategory)
        .map(parent => ({
            ...parent,
            subcategories: categories.filter(sub =>
                sub.parentCategory && sub.parentCategory.toString() === parent._id.toString()
            )
        }));

    console.log(groupedCategories, "this si sgroup categoris")

    res.render(`admin/offer`, { offer, product, categories: groupedCategories, admin: true })
}




exports.offerEditRender = async (req, res) => {
    const offerId = req.params.offerId
    const offer = await Offer.findById(offerId).lean()
    const product = await Product.find().lean()

    const categories = await Category.find().lean()
    const groupedCategories = categories
        .filter(cat => !cat.parentCategory)
        .map(parent => ({
            ...parent,
            subcategories: categories.filter(sub =>
                sub.parentCategory && sub.parentCategory.toString() === parent._id.toString()
            )
        }));

    res.render(`admin/editOffer`, { offer, product, categories: groupedCategories, admin: true })
}










exports.createOffer = async (req, res) => {
    try {
        const {
            offerCode,
            offerType,
            categoryTargetIds,
            subcategoryTargetIds,
            productTargetIds,
            discountType,
            discountValue,
            minimumPurchaseAmount,
            endDate
        } = req.body;



        // Determine targetIds based on offerType
        let targetIds = [];
        if (offerType === 'category' && categoryTargetIds) {
            targetIds = Array.isArray(categoryTargetIds) ? categoryTargetIds : [categoryTargetIds];
        } else if (offerType === 'subcategory' && subcategoryTargetIds) {
            targetIds = Array.isArray(subcategoryTargetIds) ? subcategoryTargetIds : [subcategoryTargetIds];
        } else if (offerType === 'product' && productTargetIds) {
            targetIds = Array.isArray(productTargetIds) ? productTargetIds : [productTargetIds];
        }


        // Create the offer
        const offer = new Offer({
            offerCode: offerCode.toUpperCase(),
            offerType,
            targetIds,
            discountType,
            discountValue: Number(discountValue),
            minimumPurchaseAmount: minimumPurchaseAmount ? Number(minimumPurchaseAmount) : 0,
            endDate: new Date(endDate),
            isActive: true
        });

        // Save to database
        const savedOffer = await offer.save();


        ////////////////////////////////////////////////////////////////////////////

        // If offer is product-wise, update product prices
        if (offerType === 'product' && targetIds.length > 0) {
            await updateProductPrices(targetIds, discountType, discountValue, savedOffer._id);
        } else if (offerType === 'subcategory' && targetIds.length > 0) {
            await applySubcategoryOffer(targetIds, discountType, discountValue, savedOffer._id)
        } else if (offerType === 'category' && targetIds.length > 0) {
            await applyCategoryOffer(targetIds, discountType, discountValue, savedOffer._id)
        }

        res.status(201).json({
            success: true,
            type: "success",
            message: "Offer created successfully",
            offer: savedOffer
        });


    } catch (err) {
        console.error("Error creating offer:", err);

        // Handle duplicate offer code error
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Offer code already exists"
            });
        }

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Validation error",
                errors: messages
            });
        }

        // Generic error handler
        res.status(500).json({
            success: false,
            type: "error",
            message: "Internal server error",
            error: err.message
        });
    }
};







exports.editOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const {
            offerCode,
            offerType,
            categoryTargetIds,
            subcategoryTargetIds,
            productTargetIds,
            discountType,
            discountValue,
            minimumPurchaseAmount,
            endDate,
        } = req.body;

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

        // Handle target IDs based on offer type
        if (offerType !== undefined) {
            existingOffer.offerType = offerType;

            // Only update targetIds if the corresponding IDs are provided
            if (offerType === 'category' && categoryTargetIds !== undefined) {
                existingOffer.targetIds = Array.isArray(categoryTargetIds)
                    ? categoryTargetIds
                    : [categoryTargetIds];
            }
            else if (offerType === 'subcategory' && subcategoryTargetIds !== undefined) {
                existingOffer.targetIds = Array.isArray(subcategoryTargetIds)
                    ? subcategoryTargetIds
                    : [subcategoryTargetIds];
            }
            else if (offerType === 'product' && productTargetIds !== undefined) {
                existingOffer.targetIds = Array.isArray(productTargetIds)
                    ? productTargetIds
                    : [productTargetIds];
            }
            // If offerType changed but no new target IDs provided, keep existing targetIds
        }

        // Update other fields if provided
        if (discountType !== undefined) existingOffer.discountType = discountType;
        if (discountValue !== undefined) existingOffer.discountValue = Number(discountValue);
        if (minimumPurchaseAmount !== undefined) {
            existingOffer.minimumPurchaseAmount = Number(minimumPurchaseAmount);
        }
        if (endDate !== undefined) existingOffer.endDate = new Date(endDate);

        // Validate the updated offer
        await existingOffer.validate();

        // Save the updated offer
        const updatedOffer = await existingOffer.save();

        res.status(200).json({
            success: true,
            type: "success",
            message: "Offer updated successfully",
            offer: updatedOffer
        });

    } catch (err) {
        console.error("Error updating offer:", err);

        // Handle duplicate offer code error
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Offer code already exists"
            });
        }

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Validation error",
                errors: messages
            });
        }

        // Handle invalid ObjectId
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Invalid offer ID"
            });
        }

        // Generic error handler
        res.status(500).json({
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

        // 1. First reset all products with this offer
        const updateResult = await Product.updateMany(
            { 'details.currentOffer': offerId },
            {
                $set: {
                    'details.$[elem].discountPrice': 0,
                    'details.$[elem].currentOffer': null,

                }
            },
            {
                arrayFilters: [{ 'elem.currentOffer': offerId }]
            }
        );

        // 2. Then delete the offer
        const deletedOffer = await Offer.findByIdAndDelete(offerId);

        if (!deletedOffer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Offer deleted successfully',
            productsReset: updateResult.nModified
        });

    } catch (err) {
        console.error('Error deleting offer:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
};
