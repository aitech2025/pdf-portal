import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Category, Pdf, Program, SchoolCategoryAccess } from "../models/index.js";
import { isPlatformRole, requireCurrentUser } from "../lib/access.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth } from "../plugins/auth.js";

export const registerSearchRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/search", { preHandler: requireAuth }, async (request, reply) => {
    const user = await requireCurrentUser(request, reply);
    if (!user) return;
    const query = z
      .object({
        q: z.string().min(1),
        type: z.enum(["pdfs", "categories", "all"]).optional(),
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(20)
      })
      .parse(request.query);

    const regex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    // Fetch school grants once and reuse for both PDF and category filters
    const schoolGrants = !isPlatformRole(user.role)
      ? await SchoolCategoryAccess.find({ school_id: user.school_id ?? "" }).lean()
      : null;
    const grantedCategoryIds = schoolGrants?.map((g) => g.category_id);

    const pdfFilter: Record<string, unknown> = {
      deleted_at: null,
      status: "approved",
      is_active: true,
      $or: [
        { file_name: regex },
        { pdf_id: regex },
        { description: regex },
        { tags: regex }
      ]
    };
    if (grantedCategoryIds) pdfFilter.category_id = { $in: grantedCategoryIds };

    const skip = (query.page - 1) * query.per_page;
    const [pdfs, pdfTotal] = await Promise.all([
      Pdf.find(pdfFilter).select({ file_data: 0 }).sort({ created: -1 }).skip(skip).limit(query.per_page).lean(),
      Pdf.countDocuments(pdfFilter)
    ]);

    let categories: unknown[] = [];
    if (query.type !== "pdfs") {
      const catFilter: Record<string, unknown> = {
        $or: [{ category_name: regex }, { category_code: regex }, { slug: regex }]
      };
      if (grantedCategoryIds) catFilter.id = { $in: grantedCategoryIds };
      categories = await Category.find(catFilter).limit(20).lean();
    }

    const programs =
      isPlatformRole(user.role) && query.type !== "pdfs"
        ? await Program.find({ $or: [{ program_name: regex }, { program_code: regex }] }).limit(10).lean()
        : [];

    return {
      query: query.q,
      pdfs: listResponse(
        pdfs.map((p) => serializeDoc(p as Record<string, unknown>)),
        pdfTotal
      ),
      categories: listResponse(categories.map((c) => serializeDoc(c as Record<string, unknown>))),
      programs: listResponse(programs.map((p) => serializeDoc(p as Record<string, unknown>)))
    };
  });
};
