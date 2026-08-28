import offerService from '../services/offerService.js';

//MESSAGE_CONSTANTS
import OFFER_MESAGES from '../constants/offer.js';
import STATUS_CODES from '../constants/status-codes.js';


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
      errorMessage: OFFER_MESAGES.FAILED_FETCHING,
    });
  }
};




exports.createOffer = async (req, res) => {
  try {
    const savedOffer = await offerService.createOffer(req.body);
    return res.status(STATUS_CODES.CREATED).json({
      success: true,
      type: "success",
      message: OFFER_MESAGES.CREATED,
      offer: savedOffer,
    });
  } catch (err) {
    const status = err.status || STATUS_CODES.INTERNAL_SERVER_ERROR;
    return res.status(status).json({
      success: false,
      type: "error",
      message: err.message || OFFER_MESAGES.FAILED_CREATED,
      error: err.error || err.message,
    });
  }
};




exports.offerEditJson = async (req, res) => {
  try {
    const offer = await offerService.getOfferById(req.params.offerId);
    return res.json(offer);
  } catch (err) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }
};




exports.totalListOfCategories = async (req, res) => {
  try {
    const result = await offerService.getPaginatedSubcategories(req.query);
    return res.json(result);
  } catch (err) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }
};




exports.totalListOfProducts = async (req, res) => {
  try {
    const result = await offerService.getPaginatedProducts(req.query);
    return res.json(result);
  } catch (err) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }
};




exports.editOffer = async (req, res) => {
  try {
    const updatedOffer = await offerService.updateOffer(
      req.params.offerId,
      req.body,
    );
    return res.status(STATUS_CODES.OK).json({
      success: true,
      type: "success",
      message: OFFER_MESAGES.UPDATED,
      offer: updatedOffer,
    });
  } catch (err) {
    const status = err.status || STATUS_CODES.INTERNAL_SERVER_ERROR;
    return res.status(status).json({
      success: false,
      type: "error",
      message: err.message || OFFER_MESAGES.FAILED_UPDATED,
      error: err.error || err.message,
    });
  }
};




exports.offerDelete = async (req, res) => {
  try {
    await offerService.deleteOffer(req.params.offerId);
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: OFFER_MESAGES.DELETED,
    });
  } catch (err) {
    const status = err.status || STATUS_CODES.INTERNAL_SERVER_ERROR;
    return res.status(status).json({
      success: false,
      message: err.message || OFFER_MESAGES.FAILED_DELETING,
      error: err.error || err.message,
    });
  }
};
