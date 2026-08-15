const settingsService = require("../services/settingsService");

exports.initializeSettings = async () => {
    await settingsService.initializeGlobalSettings();
};

exports.landingPage = async (req, res) => {
    return res.render(`admin/settings/landingPage`, { isSettings: true });
};

exports.referralSettingsRender = async (req, res) => {
    try {
        const settings = await settingsService.getReferralSettings();
        return res.render("admin/settings/referralSettings", {
            isSettings: true,
            settings,
        });
    } catch (error) {
        const statusCode = error.message === "Referral settings not found." ? 404 : 500;
        const viewPath = statusCode === 404 ? "error/404" : "error/500";
        return res.status(statusCode).render(viewPath, {
            message: error.message || "Unable to load referral settings.",
        });
    }
};

exports.referralSettings = async (req, res) => {
    try {
        const updatedSettings = await settingsService.updateReferralSettings(req.body);
        return res.status(200).json({
            success: true,
            message: "Referral settings updated successfully.",
            referralSettings: updatedSettings,
        });
    } catch (error) {
        const statusCode = error.status || 400;
        return res.status(statusCode).json({
            success: false,
            field: error.field || null,
            message: error.message || "Internal server error.",
        });
    }
};