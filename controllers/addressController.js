import * as addressService from '../services/addressService.js';

//MESSAGE_CONSTANTS
import ADDRESS_MESSAGE from '../constants/address.js';
import COMMON_MESSAGE from '../constants/common-messages.js';
import STATUS_CODES from '../constants/status-codes.js';

//////////////////////////////////////////////////////////////////////////////////////////////////
// THIS ENTIRE CONTROLLER USES  JSON RETURNS

// Add new address
export const addAddress = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const {
      name,
      phone,
      zip,
      streetAddress,
      landmark,
      city,
      state,
      country,
      isDefault,
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "name",
      "phone",
      "zip",
      "streetAddress",
      "city",
      "state",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: COMMON_MESSAGE.ALL_FIELDS_REQUIRED,
        missingFields,
      });
    }

    // Validate phone number
    if (!/^\d{10}$/.test(phone)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: ADDRESS_MESSAGE.PHONE_INVALID,
      });
    }

    // Validate zip code
    if (!/^\d{6}$/.test(zip)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: ADDRESS_MESSAGE.ZIP_INVALID,
      });
    }

    // Delegate database execution to the service layer
    const newAddress = await addressService.createAddress({
      userId,
      name,
      phone,
      zip,
      streetAddress,
      landmark: landmark || "",
      city,
      state,
      country: country || "India",
      isDefault: isDefault || false,
    });

    return res.json({
      success: true,
      message: ADDRESS_MESSAGE.ADDED,
      address: newAddress,
    });
  } catch {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ADDRESS_MESSAGE.FAILED_ADDED,
    });
  }
};




export const renderEditForm = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = res.locals.user._id;

    // Fetch the address
    const address = await addressService.getAddressForEdit(addressId, userId);

    // If not found, return JSON error
    if (!address) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: ADDRESS_MESSAGE.NOT_FOUND,
      });
    }

    // Return the successful JSON response your frontend expects
    return res.status(STATUS_CODES.OK).json({
      success: true,
      address: address,
    });
  } catch {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ADDRESS_MESSAGE.FAILED_LOAD_UPDATEFORM,
    });
  }
};




// Edit existing address
export const editAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = res.locals.user._id;
    const {
      name,
      phone,
      zip,
      streetAddress,
      landmark,
      city,
      state,
      country,
      isDefault,
    } = req.body;

    // Object to track field-specific errors
    const errors = {};

    // Validate required fields individually for the frontend
    const requiredFields = [
      "name",
      "phone",
      "zip",
      "streetAddress",
      "city",
      "state",
    ];
    requiredFields.forEach((field) => {
      if (!req.body[field] || req.body[field].trim() === "") {
        errors[field] =
          `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
      }
    });

    // Validate phone number format
    if (phone && !/^\d{10}$/.test(phone)) {
      errors.phone = ADDRESS_MESSAGE.PHONE_INVALID;
    }

    // Validate zip code format
    if (zip && !/^\d{6}$/.test(zip)) {
      errors.zip = ADDRESS_MESSAGE.ZIP_INVALID;
    }

    // If any validation errors exist, return 400 with the errors object
    if (Object.keys(errors).length > 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: ADDRESS_MESSAGE.FIELD_VALIDATION,
        errors: errors,
      });
    }

    // Delegate database verification and update to the service layer
    const updatedAddress = await addressService.updateAddress(
      addressId,
      userId,
      {
        name,
        phone,
        zip,
        streetAddress,
        landmark,
        city,
        state,
        country,
        isDefault,
      },
    );

    if (!updatedAddress) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: ADDRESS_MESSAGE.NOT_FOUND,
      });
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: ADDRESS_MESSAGE.UPDATED,
      address: updatedAddress,
    });
  } catch {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ADDRESS_MESSAGE.FAILED_UPDATED,
    });
  }
};





// Delete address
export const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = res.locals.user._id;

    // Delegate deletion logic to the service layer
    const result = await addressService.deleteAddress(addressId, userId);

    if (!result.success) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: result.message,
    });
  } catch {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ADDRESS_MESSAGE.FAILED_DELETE,
    });
  }
};
