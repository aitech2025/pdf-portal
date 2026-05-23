import { AnalyticsEvent, AuthToken, DownloadLog, OnboardingRequest, Pdf, School, SchoolCategoryAccess, User } from "../models/index.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
export const registerAnalyticsRoutes = async (app) => {
    app.get("/api/dashboard", { preHandler: requireAuth }, async () => {
        const [user_count, school_count, active_school_count, pdf_count, pending_onboarding, active_sessions] = await Promise.all([
            User.countDocuments(),
            School.countDocuments(),
            School.countDocuments({ is_active: true }),
            Pdf.countDocuments({ deleted_at: null }),
            OnboardingRequest.countDocuments({ status: "pending" }),
            AuthToken.countDocuments({
                token_type: "refresh",
                revoked_at: null,
                expires_at: { $gt: new Date() }
            })
        ]);
        const topDownloads = await DownloadLog.aggregate([
            { $group: { _id: "$pdf_id", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        return {
            user_count,
            school_count,
            active_school_count,
            inactive_school_count: school_count - active_school_count,
            pdf_count,
            pending_onboarding,
            active_sessions,
            top_downloads: topDownloads
        };
    });
    app.get("/api/analytics/overview", { preHandler: requirePermission(PERMISSIONS.ANALYTICS_VIEW) }, async () => {
        const byEvent = await AnalyticsEvent.aggregate([{ $group: { _id: "$event_type", count: { $sum: 1 } } }]);
        const downloadsByCategory = await DownloadLog.aggregate([
            { $group: { _id: "$category_id", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        return { events: byEvent, downloads_by_category: downloadsByCategory };
    });
    app.get("/api/analytics/school", { preHandler: requireAuth }, async (request) => {
        const schoolId = request.authUser?.school_id;
        if (!schoolId)
            return { assigned_categories: 0, available_pdfs: 0, recent_downloads: 0 };
        const grants = await SchoolCategoryAccess.find({ school_id: schoolId }).lean();
        const categoryIds = grants.map((g) => g.category_id);
        const [available_pdfs, recent_downloads, assigned_categories] = await Promise.all([
            Pdf.countDocuments({ category_id: { $in: categoryIds }, deleted_at: null, status: "approved", is_active: true }),
            DownloadLog.countDocuments({ school_id: schoolId }),
            grants.length
        ]);
        return { assigned_categories, available_pdfs, recent_downloads };
    });
};
