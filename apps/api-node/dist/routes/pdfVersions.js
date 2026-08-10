import { z } from "zod";
import { Pdf, PdfVersion } from "../models/index.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { requireCurrentUser } from "../lib/access.js";
import { deleteFile, openReadStream, storeFile } from "../lib/fileStorage.js";
export const registerPdfVersionRoutes = async (app) => {
    app.get("/api/pdfVersions", { preHandler: requireAuth }, async (request) => {
        const query = z
            .object({
            pdf_id: z.string().optional(),
            pdfId: z.string().optional(),
            filter: z.string().optional()
        })
            .parse(request.query);
        const filterPdfId = query.pdf_id ?? query.pdfId ?? query.filter?.match(/pdfId\s*=\s*"([^"]+)"/)?.[1];
        return PdfVersion.find(filterPdfId ? { pdf_id: filterPdfId } : {}).sort({ version_number: -1 });
    });
    app.get("/api/pdfVersions/:version_id/download", { preHandler: requireAuth }, async (request, reply) => {
        const params = z.object({ version_id: z.string() }).parse(request.params);
        const version = await PdfVersion.findOne({ id: params.version_id });
        if (!version?.file_data && !version?.file_data_id)
            return reply.status(404).send({ detail: "PDF version not found" });
        reply.header("Content-Type", "application/pdf");
        reply.header("Content-Disposition", `attachment; filename="version-${version.version_number}.pdf"`);
        return reply.send(version.file_data_id ? openReadStream(version.file_data_id) : version.file_data);
    });
    app.post("/api/pdfVersions", { preHandler: requireRole(["admin", "platform_admin", "moderator", "school_admin"]) }, async (request, reply) => {
        const user = await requireCurrentUser(request, reply);
        if (!user)
            return;
        const file = await request.file();
        if (!file)
            return reply.status(400).send({ detail: "File is required" });
        const fields = file.fields;
        const pdfId = fields.pdf_id?.[0]?.value ?? fields.pdfId?.[0]?.value;
        if (!pdfId)
            return reply.status(400).send({ detail: "pdf_id is required" });
        const pdf = await Pdf.findOne({ id: pdfId });
        if (!pdf)
            return reply.status(404).send({ detail: "PDF not found" });
        const data = await file.toBuffer();
        const fileDataId = await storeFile(data, file.filename ?? `version-${(pdf.current_version ?? 0) + 1}.pdf`, "application/pdf");
        const nextVersion = (pdf.current_version ?? 0) + 1;
        await PdfVersion.updateMany({ pdf_id: pdfId, is_current: true }, { $set: { is_current: false } });
        const version = await PdfVersion.create({
            pdf_id: pdfId,
            version_number: nextVersion,
            file_path: "",
            file_data_id: fileDataId,
            file_size: data.length,
            uploaded_by: user.id,
            version_notes: fields.version_notes?.[0]?.value ?? fields.versionNotes?.[0]?.value ?? "",
            is_current: true
        });
        pdf.file_data_id = fileDataId;
        pdf.file_size = data.length;
        pdf.current_version = nextVersion;
        pdf.version_count = nextVersion;
        pdf.version_notes = fields.version_notes?.[0]?.value ?? fields.versionNotes?.[0]?.value ?? pdf.version_notes;
        await pdf.save();
        return version;
    });
    app.patch("/api/pdfVersions/:version_id", { preHandler: requireRole(["admin", "platform_admin", "moderator"]) }, async (request, reply) => {
        const params = z.object({ version_id: z.string() }).parse(request.params);
        const body = z.object({ version_notes: z.string().optional(), is_current: z.boolean().optional() }).parse(request.body);
        const version = await PdfVersion.findOne({ id: params.version_id });
        if (!version)
            return reply.status(404).send({ detail: "Version not found" });
        if (body.is_current) {
            await PdfVersion.updateMany({ pdf_id: version.pdf_id }, { $set: { is_current: false } });
            const filePatch = version.file_data_id
                ? { file_data_id: version.file_data_id }
                : { file_data: version.file_data, file_data_id: null };
            await Pdf.findOneAndUpdate({ id: version.pdf_id }, { $set: { ...filePatch, current_version: version.version_number } });
            version.is_current = true;
        }
        if (body.version_notes !== undefined)
            version.version_notes = body.version_notes;
        await version.save();
        return version;
    });
    app.delete("/api/pdfVersions/:version_id", { preHandler: requireRole(["admin", "platform_admin"]) }, async (request, reply) => {
        const params = z.object({ version_id: z.string() }).parse(request.params);
        const deleted = await PdfVersion.findOneAndDelete({ id: params.version_id });
        if (!deleted)
            return reply.status(404).send({ detail: "Version not found" });
        // Only free the GridFS file if the parent PDF isn't still pointing at it
        // (it is, whenever the deleted version was the current one).
        if (deleted.file_data_id) {
            const pdf = await Pdf.findOne({ id: deleted.pdf_id }).lean();
            if (pdf?.file_data_id !== deleted.file_data_id) {
                await deleteFile(deleted.file_data_id);
            }
        }
        return { message: "Version deleted" };
    });
};
