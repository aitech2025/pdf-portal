import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Category, School, SchoolCategoryAccess, User } from "../models/index.js";
import { writeAudit } from "../lib/audit.js";
import { createSchoolAdminUser, genSchoolId } from "../lib/schools.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { createAndSendNotification } from "../services/notificationChannels.js";

/**
 * Fan-out credential delivery for a new school admin.
 * loginId  — the generated @iiconacademy.in address shown as the login credential.
 * contactEmail — the school's real contact email; this is where the email is delivered.
 *               If absent, only WhatsApp is attempted (when mobileNumber is present).
 */
const sendCredentialNotifications = async (opts: {
  userId: string;
  userName: string;
  loginId: string;
  contactEmail?: string | null;
  schoolName: string;
  schoolId: string;
  password: string;
  mobileNumber?: string | null;
}): Promise<void> => {
  const { userId, userName, loginId, contactEmail, schoolName, schoolId, password, mobileNumber } = opts;

  const subject = "Welcome to i-icon Academy — your school/college account is ready";
  const mobileNote = mobileNumber
    ? `  Mobile: ${mobileNumber} (can also be used to log in)\n`
    : "";
  const text =
    `Dear ${userName},\n\n` +
    `Your school/college "${schoolName}" (ID: ${schoolId}) has been registered on i-icon Academy.\n\n` +
    `Your login credentials:\n` +
    `  User ID: ${loginId}\n` +
    `  Password: ${password}\n` +
    mobileNote +
    `\nUse these credentials to log in to i-icon Academy.\n\n` +
    `— i-icon Academy team`;

  const mobileHtml = mobileNumber
    ? `<div><strong>Mobile (alternate login):</strong> ${mobileNumber}</div>`
    : "";
  const html =
    `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">` +
    `<h2 style="margin:0 0 16px;color:#4338ca">Welcome to i-icon Academy</h2>` +
    `<p>Dear ${userName},</p>` +
    `<p>Your school/college <strong>${schoolName}</strong> (ID: <code>${schoolId}</code>) has been registered on i-icon Academy.</p>` +
    `<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0">` +
    `<div><strong>User ID:</strong> <code style="font-family:monospace;background:#fff;padding:2px 6px;border-radius:4px">${loginId}</code></div>` +
    `<div style="margin-top:8px"><strong>Password:</strong> <code style="font-family:monospace;background:#fff;padding:2px 6px;border-radius:4px">${password}</code></div>` +
    (mobileNumber ? `<div style="margin-top:8px"><strong>Mobile (alternate login):</strong> ${mobileNumber}</div>` : "") +
    `</div>` +
    `<p>Use these credentials to log in to i-icon Academy.</p>` +
    `<p style="font-size:12px;color:#94a3b8;margin-top:24px">— i-icon Academy team</p>` +
    `</div>`;

  // Deliver email to the school's contact email, not the generated login address.
  const channels: Array<"email" | "whatsapp"> = [];
  if (contactEmail) channels.push("email");
  if (mobileNumber) channels.push("whatsapp");
  if (!channels.length) return;

  await createAndSendNotification({
    recipient: { id: userId, email: contactEmail ?? "", mobile_number: mobileNumber, name: userName },
    channels,
    type: "credential_delivery",
    subject,
    message: text,
    html
  });
};

const parseSchoolBody = (body: Record<string, unknown>) => ({
  school_name: (body.schoolName ?? body.school_name) as string,
  email: body.email as string | undefined,
  location: body.location as string | undefined,
  address: body.address as string | undefined,
  mobile_number: (body.mobileNumber ?? body.mobile_number) as string | undefined,
  point_of_contact_name: (body.pointOfContactName ?? body.point_of_contact_name) as string | undefined,
  point_of_contact_mobile: (body.pointOfContactMobile ?? body.point_of_contact_mobile) as string | undefined,
  principal_name: (body.principalName ?? body.principal_name) as string | undefined,
  grades: body.grades as string | undefined,
  institution_type: (body.institutionType ?? body.institution_type ?? "school") as string,
  is_active: (body.isActive ?? body.is_active ?? true) as boolean,
  send_email: (body.sendEmail ?? body.send_email ?? true) as boolean,
  password: body.password as string | undefined
});

const schoolToResponse = (school: { toObject: () => Record<string, unknown> }, extra?: Record<string, unknown>) => ({
  ...serializeDoc(school.toObject()),
  ...extra
});

export const registerSchoolRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/schools", { preHandler: requireAuth }, async (request) => {
    const query = z
      .object({
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(100),
        sort: z.string().optional(),
        filter: z.string().optional()
      })
      .parse(request.query);

    const filter: Record<string, unknown> = {};
    if (query.filter) {
      const regex = new RegExp(query.filter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      // Search across every displayed/identifying column.
      filter.$or = [
        { school_name: regex },
        { school_id: regex },
        { email: regex },
        { location: regex },
        { address: regex },
        { mobile_number: regex },
        { point_of_contact_name: regex }
      ];
    }

    const sortField =
      query.sort === "schoolName" || query.sort === "-schoolName"
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
        .limit(query.per_page)
        .lean(),
      School.countDocuments(filter)
    ]);
    return listResponse(rows.map((s) => serializeDoc(s as Record<string, unknown>)), total);
  });

  app.get("/api/schools/:school_id", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ school_id: z.string() }).parse(request.params);
    const school = await School.findOne({ id: params.school_id });
    if (!school) return reply.status(404).send({ detail: "School not found" });
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

    let generatedPassword: string | undefined;
    let generatedEmail: string | undefined;
    {
      let adminUser: Awaited<ReturnType<typeof createSchoolAdminUser>>["user"];
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
      } catch (err) {
        await School.findOneAndDelete({ id: school.id });
        return reply.status(409).send({ detail: (err as Error).message });
      }
      // Fire-and-forget — do not block the HTTP response on email/WhatsApp delivery
      sendCredentialNotifications({
        userId: adminUser.id,
        userName: adminUser.name,
        loginId: generatedEmail!,
        contactEmail: body.email,
        schoolName: school.school_name,
        schoolId: school_id,
        password: generatedPassword!,
        mobileNumber: adminUser.mobile_number
      }).catch(err => console.error("[schools] credential notification failed:", (err as Error).message));
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
      const categoriesRaw = (row.categories ?? row.category ?? row.category_ids ?? row.categoryIds ?? "") as string;
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

      let generatedPassword: string | undefined;
      let generatedEmail: string | undefined;
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
        sendCredentialNotifications({
          userId: result.user.id,
          userName: result.user.name,
          loginId: generatedEmail!,
          contactEmail: parsed.email,
          schoolName: school.school_name,
          schoolId: school_id,
          password: generatedPassword!,
          mobileNumber: result.user.mobile_number
        }).catch(err => console.error("[schools/bulk] credential notification failed:", (err as Error).message));
      } catch {
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
            await SchoolCategoryAccess.updateOne(
              { school_id: school.id, category_id: cat.id },
              { $setOnInsert: { school_id: school.id, category_id: cat.id } },
              { upsert: true }
            );
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
    const update: Record<string, unknown> = {};
    if (body.schoolName !== undefined) update.school_name = body.schoolName;
    if (body.school_name !== undefined) update.school_name = body.school_name;
    if (body.email !== undefined) update.email = body.email;
    if (body.location !== undefined) update.location = body.location;
    if (body.address !== undefined) update.address = body.address;
    if (body.mobileNumber !== undefined) update.mobile_number = body.mobileNumber;
    if (body.isActive !== undefined) update.is_active = body.isActive;
    if (body.institutionType !== undefined) update.institution_type = body.institutionType;
    if (body.institution_type !== undefined) update.institution_type = body.institution_type;
    if (body.deactivationMessage !== undefined) update.deactivation_message = body.deactivationMessage;
    const updated = await School.findOneAndUpdate({ id: params.school_id }, { $set: update }, { new: true });
    if (!updated) return reply.status(404).send({ detail: "School not found" });
    return serializeDoc(updated.toObject());
  });

  app.delete("/api/schools/:school_id", { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) }, async (request, reply) => {
    const params = z.object({ school_id: z.string() }).parse(request.params);
    const deleted = await School.findOneAndDelete({ id: params.school_id });
    if (!deleted) return reply.status(404).send({ detail: "School not found" });
    await User.deleteMany({ school_id: params.school_id });
    return { message: "School deleted" };
  });

  app.get("/api/schools/:school_id/stats", { preHandler: requireAuth }, async (request) => {
    const params = z.object({ school_id: z.string() }).parse(request.params);
    const userCount = await User.countDocuments({ school_id: params.school_id });
    const activeUsers = await User.countDocuments({ school_id: params.school_id, is_active: true });
    return { user_count: userCount, active_user_count: activeUsers };
  });

  app.post(
    "/api/schools/:school_id/toggle-users",
    { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) },
    async (request) => {
      const params = z.object({ school_id: z.string() }).parse(request.params);
      const body = z.object({ is_active: z.boolean(), isActive: z.boolean().optional() }).parse(request.body);
      const isActive = body.isActive ?? body.is_active;
      const result = await User.updateMany({ school_id: params.school_id }, { $set: { is_active: isActive } });
      return { modified_count: result.modifiedCount };
    }
  );
};
