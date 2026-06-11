import { z } from "zod";
import { Category, School, SchoolCategoryAccess, User } from "../models/index.js";
import { writeAudit } from "../lib/audit.js";
import { createSchoolAdminUser, genSchoolId } from "../lib/schools.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { createAndSendNotification } from "../services/notificationChannels.js";
/** Fan-out credential delivery to in-app + email + WhatsApp for a new school admin */
const sendCredentialNotifications = async (userId, userName, userEmail, schoolName, schoolId, password, mobileNumber) => {
    const subject = "Welcome to i-icon Academy — your school account is ready";
    const text = `Dear ${userName},\n\n` +
        `Your school "${schoolName}" (ID: ${schoolId}) has been registered on i-icon Academy.\n\n` +
        `Your login credentials:\n` +
        `  Email: ${userEmail}\n` +
        `  Password: ${password}\n\n` +
        `Please log in and change your password immediately on first sign-in.\n\n` +
        `— i-icon Academy team`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">` +
        `<h2 style="margin:0 0 16px;color:#4338ca">Welcome to i-icon Academy</h2>` +
        `<p>Dear ${userName},</p>` +
        `<p>Your school <strong>${schoolName}</strong> (ID: <code>${schoolId}</code>) has been registered on i-icon Academy.</p>` +
        `<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0">` +
        `<div><strong>Email:</strong> ${userEmail}</div>` +
        `<div><strong>Temporary password:</strong> <code style="font-family:monospace;background:#fff;padding:2px 6px;border-radius:4px">${password}</code></div>` +
        `</div>` +
        `<p>Please log in and change your password on first sign-in.</p>` +
        `<p style="font-size:12px;color:#94a3b8;margin-top:24px">— i-icon Academy team</p>` +
        `</div>`;
    const channels = ["email"];
    if (mobileNumber)
        channels.push("whatsapp");
    await createAndSendNotification({
        recipient: { id: userId, email: userEmail, mobile_number: mobileNumber, name: userName },
        channels,
        type: "credential_delivery",
        subject,
        message: text,
        html
    });
};
const parseSchoolBody = (body) => ({
    school_name: (body.schoolName ?? body.school_name),
    email: body.email,
    location: body.location,
    address: body.address,
    mobile_number: (body.mobileNumber ?? body.mobile_number),
    point_of_contact_name: (body.pointOfContactName ?? body.point_of_contact_name),
    point_of_contact_mobile: (body.pointOfContactMobile ?? body.point_of_contact_mobile),
    principal_name: (body.principalName ?? body.principal_name),
    grades: body.grades,
    institution_type: (body.institutionType ?? body.institution_type ?? "school"),
    is_active: (body.isActive ?? body.is_active ?? true),
    send_email: (body.sendEmail ?? body.send_email ?? true),
    password: body.password
});
const schoolToResponse = (school, extra) => ({
    ...serializeDoc(school.toObject()),
    ...extra
});
export const registerSchoolRoutes = async (app) => {
    app.get("/api/schools", { preHandler: requireAuth }, async (request) => {
        const query = z
            .object({
            page: z.coerce.number().default(1),
            per_page: z.coerce.number().default(100),
            sort: z.string().optional(),
            filter: z.string().optional()
        })
            .parse(request.query);
        const filter = {};
        if (query.filter) {
            const regex = new RegExp(query.filter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [{ school_name: regex }, { school_id: regex }, { email: regex }];
        }
        const sortField = query.sort === "schoolName" || query.sort === "-schoolName"
            ? "school_name"
            : query.sort === "created" || query.sort === "-created"
                ? "created"
                : "created";
        const sortDir = query.sort?.startsWith("-") ? -1 : 1;
        const skip = (query.page - 1) * query.per_page;
        const [rows, total] = await Promise.all([
            School.find(filter)
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(query.per_page),
            School.countDocuments(filter)
        ]);
        return listResponse(rows.map((s) => serializeDoc(s.toObject())), total);
    });
    app.get("/api/schools/:school_id", { preHandler: requireAuth }, async (request, reply) => {
        const params = z.object({ school_id: z.string() }).parse(request.params);
        const school = await School.findOne({ id: params.school_id });
        if (!school)
            return reply.status(404).send({ detail: "School not found" });
        return serializeDoc(school.toObject());
    });
    app.post("/api/schools", { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) }, async (request, reply) => {
        const body = parseSchoolBody(z.record(z.string(), z.unknown()).parse(request.body));
        if (!body.school_name) {
            return reply.status(400).send({ detail: "schoolName is required" });
        }
        const school_id = await genSchoolId();
        const school = await School.create({
            school_name: body.school_name,
            school_id,
            institution_type: body.institution_type,
            location: body.location,
            address: body.address,
            email: body.email,
            mobile_number: body.mobile_number,
            point_of_contact_name: body.point_of_contact_name,
            point_of_contact_mobile: body.point_of_contact_mobile,
            principal_name: body.principal_name,
            grades: body.grades,
            is_active: body.is_active
        });
        let generatedPassword;
        let generatedEmail;
        {
            let adminUser;
            try {
                const result = await createSchoolAdminUser({
                    school_name: body.school_name,
                    name: body.point_of_contact_name || body.school_name,
                    schoolId: school.id,
                    mobile_number: body.mobile_number,
                    password: body.password
                });
                adminUser = result.user;
                generatedPassword = result.generatedPassword;
                generatedEmail = result.generatedEmail;
            }
            catch (err) {
                await School.findOneAndDelete({ id: school.id });
                return reply.status(409).send({ detail: err.message });
            }
            // Fire-and-forget — do not block the HTTP response on email/WhatsApp delivery
            sendCredentialNotifications(adminUser.id, adminUser.name, adminUser.email, school.school_name, school_id, generatedPassword, adminUser.mobile_number).catch(err => console.error("[schools] credential notification failed:", err.message));
        }
        if (request.authUser?.sub) {
            await writeAudit({
                user_id: request.authUser.sub,
                action: "school_create",
                resource_type: "school",
                resource_id: school.id,
                action_details: `Created school ${school.school_name} (${school_id})`,
                request
            });
        }
        return schoolToResponse(school, { generatedEmail, generatedPassword, sendEmail: body.send_email });
    });
    app.post("/api/schools/bulk", { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) }, async (request) => {
        const body = z
            .object({
            schools: z.array(z.record(z.string(), z.unknown()))
        })
            .parse(request.body);
        const created = [];
        for (const row of body.schools) {
            const parsed = parseSchoolBody(row);
            // Support category/categories columns: comma-separated category IDs or names.
            const categoriesRaw = (row.categories ?? row.category ?? row.category_ids ?? row.categoryIds ?? "");
            const categoryIds = categoriesRaw
                ? String(categoriesRaw).split(",").map((s) => s.trim()).filter(Boolean)
                : [];
            const school_id = await genSchoolId();
            const school = await School.create({
                school_name: parsed.school_name,
                school_id,
                institution_type: parsed.institution_type ?? "school",
                location: parsed.location,
                address: parsed.address,
                email: parsed.email,
                mobile_number: parsed.mobile_number,
                point_of_contact_name: parsed.point_of_contact_name,
                point_of_contact_mobile: parsed.point_of_contact_mobile,
                principal_name: parsed.principal_name,
                grades: parsed.grades,
                is_active: parsed.is_active ?? true
            });
            let generatedPassword;
            let generatedEmail;
            try {
                const result = await createSchoolAdminUser({
                    school_name: parsed.school_name,
                    name: parsed.point_of_contact_name || parsed.school_name,
                    schoolId: school.id,
                    mobile_number: parsed.mobile_number
                });
                generatedPassword = result.generatedPassword;
                generatedEmail = result.generatedEmail;
                // Fire-and-forget — do not block bulk creation on notification delivery
                sendCredentialNotifications(result.user.id, result.user.name, result.user.email, school.school_name, school_id, generatedPassword, result.user.mobile_number).catch(err => console.error("[schools/bulk] credential notification failed:", err.message));
            }
            catch {
                /* skip schools whose generated email is already taken */
            }
            // Assign categories if provided
            if (categoryIds.length) {
                for (const catIdOrName of categoryIds) {
                    // Try by id first, then by name
                    const cat = await Category.findOne({
                        $or: [{ id: catIdOrName }, { category_name: new RegExp(`^${catIdOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }]
                    }).lean();
                    if (cat) {
                        await SchoolCategoryAccess.updateOne({ school_id: school.id, category_id: cat.id }, { $setOnInsert: { school_id: school.id, category_id: cat.id } }, { upsert: true });
                    }
                }
            }
            const result = serializeDoc(school.toObject());
            created.push({ ...result, generatedPassword, status: "created" });
        }
        return { results: created, total: created.length, created: created.length };
    });
    app.patch("/api/schools/:school_id", { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) }, async (request, reply) => {
        const params = z.object({ school_id: z.string() }).parse(request.params);
        const body = z.record(z.string(), z.unknown()).parse(request.body);
        const update = {};
        if (body.schoolName !== undefined)
            update.school_name = body.schoolName;
        if (body.school_name !== undefined)
            update.school_name = body.school_name;
        if (body.email !== undefined)
            update.email = body.email;
        if (body.location !== undefined)
            update.location = body.location;
        if (body.address !== undefined)
            update.address = body.address;
        if (body.mobileNumber !== undefined)
            update.mobile_number = body.mobileNumber;
        if (body.isActive !== undefined)
            update.is_active = body.isActive;
        if (body.institutionType !== undefined)
            update.institution_type = body.institutionType;
        if (body.institution_type !== undefined)
            update.institution_type = body.institution_type;
        if (body.deactivationMessage !== undefined)
            update.deactivation_message = body.deactivationMessage;
        const updated = await School.findOneAndUpdate({ id: params.school_id }, { $set: update }, { new: true });
        if (!updated)
            return reply.status(404).send({ detail: "School not found" });
        return serializeDoc(updated.toObject());
    });
    app.delete("/api/schools/:school_id", { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) }, async (request, reply) => {
        const params = z.object({ school_id: z.string() }).parse(request.params);
        const deleted = await School.findOneAndDelete({ id: params.school_id });
        if (!deleted)
            return reply.status(404).send({ detail: "School not found" });
        await User.deleteMany({ school_id: params.school_id });
        return { message: "School deleted" };
    });
    app.get("/api/schools/:school_id/stats", { preHandler: requireAuth }, async (request) => {
        const params = z.object({ school_id: z.string() }).parse(request.params);
        const userCount = await User.countDocuments({ school_id: params.school_id });
        const activeUsers = await User.countDocuments({ school_id: params.school_id, is_active: true });
        return { user_count: userCount, active_user_count: activeUsers };
    });
    app.post("/api/schools/:school_id/toggle-users", { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) }, async (request) => {
        const params = z.object({ school_id: z.string() }).parse(request.params);
        const body = z.object({ is_active: z.boolean(), isActive: z.boolean().optional() }).parse(request.body);
        const isActive = body.isActive ?? body.is_active;
        const result = await User.updateMany({ school_id: params.school_id }, { $set: { is_active: isActive } });
        return { modified_count: result.modifiedCount };
    });
};
