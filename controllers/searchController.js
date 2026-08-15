const searchService = require(`../services/searchService`)




exports.collections = async (req, res) => {
    try {
        const userId = res.locals.user?._id || null;
        const data = await searchService.fetchCollectionsData(req.query, userId);

        return res.render("user/collections", data);
    } catch (error) {
        return res.status(500).render("error", {
            message: "Unable to load collections"
        });
    }
};