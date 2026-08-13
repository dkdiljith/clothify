const addressService = require(`../services/addressService`);

//MESSAGE_CONSTANTS
// const MESSAGES = require(`../utils/constants`)

//////////////////////////////////////////////////////////////////////////////////////////////////
// THIS ENTIRE CONTROLLER USES  JSON RETURNS

// Add new address
exports.addAddress = async (req, res) => {
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
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        missingFields,
      });
    }

    // Validate phone number
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }

    // Validate zip code
    if (!/^\d{6}$/.test(zip)) {
      return res.status(400).json({
        success: false,
        message: "Zip code must be 6 digits",
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
      message: "Address added successfully",
      address: newAddress,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};




exports.renderEditForm = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = res.locals.user._id;

    // Fetch the address
    const address = await addressService.getAddressForEdit(addressId, userId);

    // If not found, return JSON error
    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized",
      });
    }

    // Return the successful JSON response your frontend expects
    return res.status(200).json({
      success: true,
      address: address,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching address details",
    });
  }
};




// Edit existing address
exports.editAddress = async (req, res) => {
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
      errors.phone = "Phone number must be exactly 10 digits.";
    }

    // Validate zip code format
    if (zip && !/^\d{6}$/.test(zip)) {
      errors.zip = "Zip code must be exactly 6 digits.";
    }

    // If any validation errors exist, return 400 with the errors object
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Please correct the highlighted errors.",
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
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address updated successfully.",
      address: updatedAddress,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};





// Delete address
exports.deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = res.locals.user._id;

    // Delegate deletion logic to the service layer
    const result = await addressService.deleteAddress(addressId, userId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: result.message,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete address",
    });
  }
};
