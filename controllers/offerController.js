const offerService = require("../services/offerService");

////////////////////////////////////////////////////////////////////////////////////

exports.offerRender = async (req, res) => {
  try {
    const result = await offerService.getFilteredOffers(req.query);
    return res.render("admin/offer", {
      admin: true,
      ...result,
    });
  } catch {
    return res.render("admin/offer", {
      admin: true,
      offer: [],
      query: "",
      offerType: "",
      discountType: "",
      offerStatus: "",
      pagination: {
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: 2,
        prevPage: 0,
        serialNumberStart: 0,
      },
      errorMessage: "Error fetching offers.",
    });
  }
};




exports.createOffer = async (req, res) => {
  try {
    const savedOffer = await offerService.createOffer(req.body);
    return res.status(201).json({
      success: true,
      type: "success",
      message: "Offer created successfully",
      offer: savedOffer,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      type: "error",
      message: err.message || "Internal server error",
      error: err.error || err.message,
    });
  }
};




exports.offerEditJson = async (req, res) => {
  try {
    const offer = await offerService.getOfferById(req.params.offerId);
    return res.json(offer);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};




exports.totalListOfCategories = async (req, res) => {
  try {
    const result = await offerService.getPaginatedSubcategories(req.query);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};




exports.totalListOfProducts = async (req, res) => {
  try {
    const result = await offerService.getPaginatedProducts(req.query);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};




exports.editOffer = async (req, res) => {
  try {
    const updatedOffer = await offerService.updateOffer(
      req.params.offerId,
      req.body,
    );
    return res.status(200).json({
      success: true,
      type: "success",
      message: "Offer updated successfully",
      offer: updatedOffer,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      type: "error",
      message: err.message || "Internal server error",
      error: err.error || err.message,
    });
  }
};




exports.offerDelete = async (req, res) => {
  try {
    await offerService.deleteOffer(req.params.offerId);
    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal server error",
      error: err.error || err.message,
    });
  }
};
