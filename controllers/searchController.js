const searchService = require(`../services/searchService`)

const PRODUCT_MESSAGES = require(`../constants/product`)


exports.collections = async (req, res) => {
    try {
        const userId = res.locals.user?._id || null;
        const data = await searchService.fetchCollectionsData(req.query, userId);

        return res.render("user/collections", data);
    } catch {
        return res.status(500).render("error", {
            message: PRODUCT_MESSAGES.FAILED_LOADING_COLLECTION
        });
    }
};