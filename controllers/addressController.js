const Address = require(`../models/addressSchema`)

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)


//////////////////////////////////////////////////////////////////////////////////////////////////



// Add new address
exports.addAddress = async (req, res) => {
  try {
    const userId = res.locals.user._id
    const {
      name, phone, zip, streetAddress, landmark,
      city, state, country, isDefault
    } = req.body;

    // Validate required fields
    const requiredFields = ['name', 'phone', 'zip', 'streetAddress', 'city', 'state'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        missingFields
      });
    }

    // Validate phone number
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits'
      });
    }

    // Validate zip code
    if (!/^\d{6}$/.test(zip)) {
      return res.status(400).json({
        success: false,
        message: 'Zip code must be 6 digits'
      });
    }

    // If setting as default, update all other addresses
    if (isDefault) {
      await Address.updateMany(
        { userId },
        { $set: { isDefault: false } }
      );
    }

    const newAddress = new Address({
      userId,
      name,
      phone,
      zip,
      streetAddress,
      landmark: landmark || '',
      city,
      state,
      country: country || 'India',
      isDefault: isDefault || false
    });

    await newAddress.save();

    // If first address, set as default
    const addressCount = await Address.countDocuments({ userId });
    if (addressCount === 1) {
      await Address.findByIdAndUpdate(newAddress._id, { $set: { isDefault: true } });
    }

    return res.json({
      success: true,
      message: 'Address added successfully',
      address: newAddress
    });

  } catch (error) {
    console.error('Error adding address:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}










exports.renderEditForm = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = res.locals.user._id

    // Get address and verify it belongs to user
    const address = await Address.findOne({ _id: addressId, userId }).lean();
    if (!address) {
      return res.status(404).render('error', { message: 'Address not found' });
    }

    // Get list of cities and states for dropdowns
    const cities = [
      "Kasaragod", "Kannur", "Wayanad", "Kozhikode", "Malappuram",
      "Palakkad", "Thrissur", "Ernakulam", "Idukki", "Kottayam",
      "Alappuzha", "Pathanamthitta", "Kollam", "Thiruvananthapuram"
    ];

    const states = ["Kerala"];
    const countries = ["India"];

    return res.render('user/editAddress', {
      address,
      cities,
      states,
      countries,
      helpers: {
        // Helper to check if option should be selected
        isSelected: function (value, selectedValue) {
          return value === selectedValue ? 'selected' : '';
        },
        // Helper to handle landmark display
        showLandmark: function (landmark) {
          return landmark || 'No landmark selected';
        }
      }
    });

  } catch (error) {
    console.error("Error rendering edit form:", error);
    console.log("error....................................................")
    return res.status(500).render('error', { message: 'Failed to load edit form' });
  }
};








  // Edit existing address
  exports.editAddress = async (req, res) => {
    try {
      const addressId = req.params.id;
      const userId = res.locals.user._id
      const {
        name, phone, zip, streetAddress, landmark,
        city, state, country, isDefault
      } = req.body;

      // Validate required fields
      const requiredFields = ['name', 'phone', 'zip', 'streetAddress', 'city', 'state'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required',
          missingFields
        });
      }

      // Validate phone number
      if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be 10 digits'
        });
      }

      // Validate zip code
      if (!/^\d{6}$/.test(zip)) {
        return res.status(400).json({
          success: false,
          message: 'Zip code must be 6 digits'
        });
      }

      // Verify address belongs to user
      const existingAddress = await Address.findOne({ _id: addressId, userId });
      if (!existingAddress) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // If setting as default, update all other addresses
      if (isDefault) {
        await Address.updateMany(
          { userId, _id: { $ne: addressId } },
          { $set: { isDefault: false } }
        );
      }

      const updatedAddress = await Address.findByIdAndUpdate(
        addressId,
        {
          name,
          phone,
          zip,
          streetAddress,
          landmark: landmark || '',
          city,
          state,
          country: country || 'India',
          isDefault: isDefault || false
        },
        { new: true }
      );

      return res.json({
        success: true,
        message: 'Address updated successfully',
        address: updatedAddress
      });

    } catch (error) {
      console.error('Error editing address:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },



  // Delete address
  exports.deleteAddress = async (req, res) => {
    try {
      const addressId = req.params.id;
      const userId = res.locals.user._id

      // Verify address belongs to user
      const address = await Address.findOne({ _id: addressId, userId });
      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      const wasDefault = address.isDefault;
      await Address.findByIdAndDelete(addressId);

      // If deleted address was default, set a new default
      if (wasDefault) {
        const remainingAddress = await Address.findOne({ userId });
        if (remainingAddress) {
          await Address.findByIdAndUpdate(
            remainingAddress._id,
            { $set: { isDefault: true } }
          );
        }
      }

      return res.json({
        success: true,
        message: 'Address deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting address:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete address'
      });
    }
  }

  

  // Set default address
  exports.setDefaultAddress = async (req, res) => {
    try {
      const addressId = req.params.id;
      const userId = res.locals.user._id

      // Verify address exists and belongs to user
      const address = await Address.findOne({ _id: addressId, userId });
      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // Update all addresses to not default
      await Address.updateMany(
        { userId },
        { $set: { isDefault: false } }
      );

      // Set the selected address as default
      const updatedAddress = await Address.findByIdAndUpdate(
        addressId,
        { $set: { isDefault: true } },
        { new: true }
      );

      return res.json({
        success: true,
        message: 'Default address updated',
        address: updatedAddress
      });

    } catch (error) {
      console.error("Error setting default address:", error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

