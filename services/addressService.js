const Address = require("../models/addressSchema");

//MESSAGE_CONSTANTS
const ADDRESS_MESSAGE = require(`../constants/address`)

/////////////////////////////////////////////////////////////////////////////////


exports.createAddress = async (addressData) => {
  const { userId, isDefault } = addressData;
  if (isDefault) {
    await Address.updateMany({ userId }, { $set: { isDefault: false } });
  }
  // Create and save the new address
  const newAddress = new Address(addressData);
  await newAddress.save();
  // If it's the user's very first address, automatically make it default
  const addressCount = await Address.countDocuments({ userId });
  if (addressCount === 1) {
    newAddress.isDefault = true;
    await newAddress.save();
  }
  return newAddress;
};




exports.getAddressForEdit = async (addressId, userId) => {
  const address = await Address.findOne({ _id: addressId, userId }).lean();
  return address;
};




exports.updateAddress = async (addressId, userId, updateData) => {
  const { isDefault } = updateData;
  // Verify address belongs to user
  const existingAddress = await Address.findOne({ _id: addressId, userId });
  if (!existingAddress) {
    return null;
  }
  // If setting as default, update all other addresses
  if (isDefault) {
    await Address.updateMany(
      { userId, _id: { $ne: addressId } },
      { $set: { isDefault: false } },
    );
  }
  const updatedAddress = await Address.findByIdAndUpdate(
    addressId,
    {
      ...updateData,
      landmark: updateData.landmark || "",
      country: updateData.country || "India",
      isDefault: isDefault || false,
    },
    { new: true },
  );
  return updatedAddress;
};




exports.deleteAddress = async (addressId, userId) => {
  // Verify address belongs to user
  const address = await Address.findOne({ _id: addressId, userId });
  if (!address) {
    return { success: false, message: ADDRESS_MESSAGE.NOT_FOUND };
  }
  const wasDefault = address.isDefault;
  await Address.findByIdAndDelete(addressId);
  // If deleted address was default, set a new default
  if (wasDefault) {
    const remainingAddress = await Address.findOne({ userId });
    if (remainingAddress) {
      await Address.findByIdAndUpdate(remainingAddress._id, {
        $set: { isDefault: true },
      });
    }
  }
  return { success: true, message: ADDRESS_MESSAGE.DELETED };
};
