import { AnalyticsEvent, AuthToken, DownloadLog, OnboardingRequest, Pdf, School, SchoolCategoryAccess, SchoolClassAccess, SchoolSubjectAccess, User, ViewLog } from "../models/index.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
export const registerAnalyticsRoutes = async (app) => {
    app.get("/api/dashboard", { preHandler: requireAuth }, async () => {
        const [user_count, school_count, active_school_count, pdf_count, pending_onboarding, active_sessions, storageAgg] = await Promise.all([
            User.countDocuments(),
            School.countDocuments(),
            School.countDocuments({ is_active: true }),
            Pdf.countDocuments({ deleted_at: null }),
            OnboardingRequest.countDocuments({ status: "pending" }),
            AuthToken.countDocuments({
                token_type: "refresh",
                revoked_at: null,
                expires_at: { $gt: new Date() }
            }),
            Pdf.aggregate([
                { $match: { deleted_at: null } },
                { $group: { _id: null, totalBytes: { $sum: "$file_size" } } }
            ])
        ]);
        const topDownloads = await DownloadLog.aggregate([
            { $group: { _id: "$pdf_id", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        const storageByTenant = await Pdf.aggregate([
            { $match: { deleted_at: null } },
            {
                $lookup: {
                    from: "schoolcategoryaccesses",
                    localField: "category_id",
                    foreignField: "category_id",
                    as: "grants"
                }
            },
            { $unwind: "$grants" },
            { $group: { _id: "$grants.school_id", bytes: { $sum: "$file_size" }, files: { $sum: 1 } } },
            { $sort: { bytes: -1 } },
            { $limit: 10 }
        ]);
        return {
            user_count,
            school_count,
            active_school_count,
            inactive_school_count: school_count - active_school_count,
            pdf_count,
            pending_onboarding,
            active_sessions,
            top_downloads: topDownloads,
            storage_bytes: storageAgg[0]?.totalBytes ?? 0,
            storage_by_school: storageByTenant.map((s) => ({
                school_id: s._id,
                bytes: s.bytes,
                files: s.files
            }))
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
        const userId = request.authUser?.sub;
        if (!schoolId) {
            return {
                assigned_categories: 0,
                available_pdfs: 0,
                recent_downloads: 0,
                my_downloads: 0,
                downloads_last_30d: 0,
                new_pdfs_last_7d: 0,
                downloads_by_category: [],
                recent_uploads: [],
                recently_viewed: [],
                storage_bytes: 0
            };
        }
        const [subjectGrants, classGrants, progGrants] = await Promise.all([
            SchoolSubjectAccess.find({ school_id: schoolId }).lean(),
            SchoolClassAccess.find({ school_id: schoolId }).lean(),
            SchoolCategoryAccess.find({ school_id: schoolId }).lean()
        ]);
        const categoryIds = progGrants.map((g) => g.category_id);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Build the same subject-level OR conditions used in GET /api/pdfs
        const orConditions = [];
        for (const g of subjectGrants) {
            orConditions.push({ category_id: g.program_id, class_id: g.class_id, subject_id: g.subject_id });
        }
        for (const g of classGrants) {
            orConditions.push({ category_id: g.program_id, sub_category_id: g.class_id, class_id: null });
        }
        for (const g of progGrants) {
            orConditions.push({ category_id: g.category_id, sub_category_id: null, class_id: null });
        }
        // When no access grants exist return an impossible match so all counts are 0
        const accessMatch = orConditions.length > 0
            ? { $or: orConditions }
            : { _id: { $exists: false } };
        const approvedFilter = { ...accessMatch, deleted_at: null, status: "approved", is_active: true };
        const [available_pdfs, recent_downloads, my_downloads, downloads_last_30d, new_pdfs_last_7d, downloadsByCategoryRaw, recent_uploads_raw, storageAgg, recentlyViewedRaw] = await Promise.all([
            Pdf.countDocuments(approvedFilter),
            DownloadLog.countDocuments({ school_id: schoolId }),
            userId ? DownloadLog.countDocuments({ school_id: schoolId, user_id: userId }) : Promise.resolve(0),
            DownloadLog.countDocuments({ school_id: schoolId, downloaded_at: { $gte: thirtyDaysAgo } }),
            Pdf.countDocuments({ ...approvedFilter, created: { $gte: sevenDaysAgo } }),
            DownloadLog.aggregate([
                { $match: { school_id: schoolId, category_id: { $in: categoryIds } } },
                { $group: { _id: "$category_id", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            Pdf.find(approvedFilter).sort({ created: -1 }).limit(6).lean(),
            Pdf.aggregate([
                { $match: { ...accessMatch, deleted_at: null } },
                { $group: { _id: null, totalBytes: { $sum: "$file_size" } } }
            ]),
            userId
                ? ViewLog.aggregate([
                    { $match: { user_id: userId } },
                    { $sort: { viewed_at: -1 } },
                    { $group: { _id: "$pdf_id", last_viewed: { $first: "$viewed_at" } } },
                    { $sort: { last_viewed: -1 } },
                    { $limit: 6 }
                ])
                : Promise.resolve([])
        ]);
        // Resolve category names for downloads_by_category
        const downloadCatIds = downloadsByCategoryRaw.map((d) => d._id).filter(Boolean);
        const catLookup = downloadCatIds.length
            ? await (await import("../models/index.js")).Category.find({ id: { $in: downloadCatIds } }).lean()
            : [];
        const catNameMap = new Map(catLookup.map((c) => [c.id, c.category_name]));
        const downloads_by_category = downloadsByCategoryRaw.map((d) => ({
            category_id: d._id,
            category_name: catNameMap.get(d._id) ?? "Unknown",
            count: d.count
        }));
        const { enrichPdfs } = await import("../lib/pdfEnrich.js");
        const recent_uploads = await enrichPdfs(recent_uploads_raw);
        // Hydrate recently viewed list (preserve aggregation order)
        const viewedIds = recentlyViewedRaw.map((r) => r._id);
        const recentlyViewedPdfs = viewedIds.length
            ? await Pdf.find({ id: { $in: viewedIds }, deleted_at: null }).lean()
            : [];
        const viewedMap = new Map(recentlyViewedPdfs.map((p) => [p.id, p]));
        const orderedViewed = viewedIds.map((id) => viewedMap.get(id)).filter(Boolean);
        const recently_viewed_enriched = await enrichPdfs(orderedViewed);
        const recently_viewed = recently_viewed_enriched.map((p, idx) => ({
            ...p,
            last_viewed: recentlyViewedRaw[idx]?.last_viewed
        }));
        return {
            assigned_categories: progGrants.length,
            available_pdfs,
            recent_downloads,
            my_downloads,
            downloads_last_30d,
            new_pdfs_last_7d,
            downloads_by_category,
            recent_uploads,
            recently_viewed,
            storage_bytes: storageAgg[0]?.totalBytes ?? 0
        };
    });
};
