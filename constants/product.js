

const PRODUCT_MESSAGES = {

    PRODUCT_NOT_FOUND:
        "Product not found.",

    PRODUCT_EXISTS:
        "Product already exists.",

    NAME_REQUIRED:
        "Product name is required.",

    INVALID_NAME:
        "Invalid product name.",

    NAME_LENGTH:
        "Product name must be between 3 and 100 characters.",

    DUPLICATE_NAME:
        "Another product with this name already exists.",

    CATEGORY_REQUIRED:
        "Category is required.",

    INVALID_CATEGORY:
        "Invalid category selected.",

    INVALID_GENDER:
        "Invalid gender selected.",

    DESCRIPTION_REQUIRED:
        "Description is required.",

    DESCRIPTION_MIN:
        "Description should contain at least 20 characters.",

    DESCRIPTION_MAX:
        "Description is too long.",

    SIZE_REQUIRED:
        "Size details are required.",

    DUPLICATE_SIZES:
        "Duplicate sizes are not allowed.",

    INVALID_SIZE:
        "Invalid size.",

    INVALID_QUANTITY:
        "Quantity must be at least 1.",

    INVALID_PRICE:
        "Price must be at least ₹200.",

    IMAGE_REQUIRED:
        "At least one image is required.",

    MAX_IMAGES:
        "Maximum 5 images allowed.",

    INVALID_IMAGE_FORMAT:
        "Invalid image format.",

    IMAGE_SIZE_LIMIT:
        "Each image must be below 10MB.",

    PRODUCT_ADD_FAILED:
        "Something went wrong while adding the product.",

    PRODUCT_UPDATE_FAILED:
        "Something went wrong while updating the product.",

    PRODUCT_DELETE_FAILED:
        "Error deleting product.",

    VARIATION_NOT_FOUND:
        "Product variation not found",

    OUT_OF_STOCK: (productName) =>
        `${productName} is out of stock`,

    VARIATION_MISSING: (productName) =>
        `${productName} variation not found`,

    FAILED_LOADING_ADDPRODUCTPAGE:
    "Failed Loading Add Product Page",
    FAILED_LOADING:
    "Failed Loading Products",

    FAILED_LOADING_COLLECTION:
    "Unable to load collections",
}



  
module.exports =PRODUCT_MESSAGES

