import { z } from "zod";
import { Favorite, Pdf } from "../models/index.js";
import { canAccessCategory, requireCurrentUser } from "../lib/access.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth } from "../plugins/auth.js";
export const registerFavoriteRoutes = async (app) => {
    app.get("/api/favorites", { preHandler: requireAuth }, async (request, reply) => {
        const user = await requireCurrentUser(request, reply);
        if (!user)
            return;
        const rows = await Favorite.find({ user_id: user.id }).sort({ created: -1 }).lean();
        const pdfIds = rows.map((r) => r.pdf_id);
        const pdfs = await Pdf.find({ id: { $in: pdfIds }, deleted_at: null }).lean();
        const pdfMap = new Map(pdfs.map((p) => [p.id, p]));
        const items = rows
            .map((f) => {
            const pdf = pdfMap.get(f.pdf_id);
            if (!pdf)
                return null;
            return { ...serializeDoc(f), pdf: serializeDoc(pdf) };
        })
            .filter(Boolean);
        return listResponse(items);
    });
    app.post("/api/favorites", { preHandler: requireAuth }, async (request, reply) => {
        const user = await requireCurrentUser(request, reply);
        if (!user)
            return;
        const body = z.object({ pdf_id: z.string().optional(), pdfId: z.string().optional() }).parse(request.body);
        const pdfId = body.pdf_id ?? body.pdfId;
        if (!pdfId)
            return reply.status(400).send({ detail: "pdfId is required" });
        const pdf = await Pdf.findOne({ id: pdfId, deleted_at: null });
        if (!pdf)
            return reply.status(404).send({ detail: "PDF not found" });
        const allowed = await canAccessCategory(user.id, user.role, user.school_id, pdf.category_id);
        if (!allowed)
            return reply.status(403).send({ detail: "Insufficient permissions" });
        const existing = await Favorite.findOne({ user_id: user.id, pdf_id: pdfId });
        if (existing)
            return serializeDoc(existing.toObject());
        const fav = await Favorite.create({ user_id: user.id, pdf_id: pdfId });
        return serializeDoc(fav.toObject());
    });
    app.delete("/api/favorites/:pdf_id", { preHandler: requireAuth }, async (request, reply) => {
        const user = await requireCurrentUser(request, reply);
        if (!user)
            return;
        const params = z.object({ pdf_id: z.string() }).parse(request.params);
        const deleted = await Favorite.findOneAndDelete({ user_id: user.id, pdf_id: params.pdf_id });
        if (!deleted)
            return reply.status(404).send({ detail: "Bookmark not found" });
        return { message: "Bookmark removed" };
    });
};
