import Product from '../models/productSchema.js';



async function verifyProductVariation(productId, variationIndex) {

        const product = await Product.findById(productId);

        if (!product) {
            return {
                isValid: false,
                product: null,
                variation: null,
                message: "Product not found."
            };
        }

        //  Check if the product is active
        if (!product.isActive) {
            return {
                isValid: false,
                product,
                variation: null,
                message: "This product is currently unavailable."
            };
        }

        //  Check if the variationIndex is valid for the product's details array
        if (variationIndex < 0 || !product.details || !product.details[variationIndex]) {
            return {
                isValid: false,
                product,
                variation: null,
                message: `Invalid variation index. This product only has ${product.details.length} variation(s).`
            };
        }

        //  If all checks pass, extract the specific variation (size, price, etc.)
        const selectedVariation = product.details[variationIndex];

        return {
            isValid: true,
            product,
            variation: selectedVariation,
            message: `Product and size (${selectedVariation.size}) are valid.`
        };

}

module.exports = { verifyProductVariation };