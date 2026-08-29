// controllers/settingsController.js
import * as settingsService from '../services/settingsService.js';
import SETTINGS_MESSAGES from '../constants/settings.js';
import STATUS_CODES from '../constants/status-codes.js';

export const initializeSettings = async () => {
    await settingsService.initializeGlobalSettings();
};

export const landingPage = async (req, res) => {
    return res.render(`admin/settings/landingPage`, { isSettings: true });
};

export const referralSettingsRender = async (req, res) => {
    try {
        const settings = await settingsService.getReferralSettings();
        return res.render("admin/settings/referralSettings", {
            isSettings: true,
            settings,
        });
    } catch (error) {
        const statusCode = error.message === SETTINGS_MESSAGES.REFERRAL_SETTINGS_NOT_FOUND ? STATUS_CODES.NOT_FOUND : STATUS_CODES.INTERNAL_SERVER_ERROR;
        const viewPath = statusCode === STATUS_CODES.NOT_FOUND ? "error/404" : "error/500";
        return res.status(statusCode).render(viewPath, {
            message: error.message || SETTINGS_MESSAGES.UNABLE_LOAD_REFERRAL,
        });
    }
};

export const referralSettings = async (req, res) => {
    try {
        const updatedSettings = await settingsService.updateReferralSettings(req.body);
        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: SETTINGS_MESSAGES.REFERRAL_UPDATED_SUCCESS,
            referralSettings: updatedSettings,
        });
    } catch (error) {
        const statusCode = error.status || STATUS_CODES.BAD_REQUEST;
        return res.status(statusCode).json({
            success: false,
            field: error.field || null,
            message: error.message || SETTINGS_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};