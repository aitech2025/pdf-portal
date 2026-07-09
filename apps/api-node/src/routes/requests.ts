import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { OnboardingRequest, UserRequest } from "../models/index.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission, requireRole } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { createSchoolAdminUser, genSchoolId } from "../lib/schools.js";
import { School } from "../models/index.js";
import { createAndSendNotification } from "../services/notificationChannels.js";

export const registerRequestRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/onboardingRequests", { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) }, async () => {
    const rows = await OnboardingRequest.find().sort({ created: -1 }).lean();
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)));
  });

  app.post("/api/onboardingRequests", async (request) => {
    const raw = z
      .object({
        school_name: z.string().optional(),
        schoolName: z.string().optional(),
        address: z.string().optional(),
        location: z.string().optional(),
        email: z.string().email(),
        mobile_number: z.string().optional(),
        mobileNumber: z.string().optional(),
        point_of_contact_name: z.string().optional(),
        pointOfContactName: z.string().optional(),
        point_of_contact_mobile: z.string().optional(),
        grades: z.string().optional(),
        category: z.string().optional(),
        institution_type: z.string().optional(),
        institutionType: z.string().optional(),
        status: z.string().optional()
      })
      .parse(request.body);

    const body = {
      school_name: raw.school_name ?? raw.schoolName ?? "",
      address: raw.address,
      location: raw.location,
      email: raw.email,
      mobile_number: raw.mobile_number ?? raw.mobileNumber,
      point_of_contact_name: raw.point_of_contact_name ?? raw.pointOfContactName,
      point_of_contact_mobile: raw.point_of_contact_mobile,
      grades: raw.grades,
      category: raw.category,
      institution_type: raw.institution_type ?? raw.institutionType ?? "school",
      status: raw.status ?? "pending"
    };
    return OnboardingRequest.create(body);
  });

  app.patch(
    "/api/onboardingRequests/:req_id",
    { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) },
    async (request, reply) => {
      const params = z.object({ req_id: z.string() }).parse(request.params);
      const body = z
        .object({
          status: z.string(),
          rejection_reason: z.string().optional(),
          rejectionReason: z.string().optional()
        })
        .parse(request.body);

      const req = await OnboardingRequest.findOne({ id: params.req_id });
      if (!req) return reply.status(404).send({ detail: "Request not found" });

      if (body.status === "approved" && req.status !== "approved") {
        const school_id = await genSchoolId();
        const school = await School.create({
          school_name: req.school_name,
          school_id,
          location: req.location,
          address: req.address,
          email: req.email,
          mobile_number: req.mobile_number,
          point_of_contact_name: req.point_of_contact_name,
          grades: req.grades,
          institution_type: (req as any).institution_type ?? "school",
          is_active: true
        });
        let generatedPassword: string | undefined;
        let generatedEmail: string | undefined;
        try {
          const result = await createSchoolAdminUser({
            school_name: req.school_name,
            name: req.point_of_contact_name || req.school_name,
            schoolId: school.id,
            mobile_number: req.mobile_number ?? undefined
          });
          generatedPassword = result.generatedPassword;
          generatedEmail = result.generatedEmail;
        } catch (err) {
          await School.findOneAndDelete({ id: school.id });
          return reply.status(409).send({ detail: (err as Error).message });
        }

        // Fire-and-forget credential notification to the school's contact email / WhatsApp
        if (generatedEmail && generatedPassword) {
          const userName = req.point_of_contact_name || req.school_name;
          const mobileNumber = req.mobile_number ?? undefined;
          const mobileNote = mobileNumber ? `  Mobile: ${mobileNumber} (can also be used to log in)\n` : "";
          const text =
            `Dear ${userName},\n\n` +
            `Your school/college "${req.school_name}" has been approved on i-icon Academy.\n\n` +
            `Your login credentials:\n` +
            `  User ID: ${generatedEmail}\n` +
            `  Password: ${generatedPassword}\n` +
            mobileNote +
            `\nUse these credentials to log in to i-icon Academy.\n\n` +
            `— i-icon Academy team`;
          const html =
            `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">` +
            `<h2 style="margin:0 0 16px;color:#4338ca">Your school/college is approved on i-icon Academy</h2>` +
            `<p>Dear ${userName},</p>` +
            `<p>Your school/college <strong>${req.school_name}</strong> has been approved.</p>` +
            `<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0">` +
            `<div><strong>User ID:</strong> <code style="font-family:monospace;background:#fff;padding:2px 6px;border-radius:4px">${generatedEmail}</code></div>` +
            `<div style="margin-top:8px"><strong>Password:</strong> <code style="font-family:monospace;background:#fff;padding:2px 6px;border-radius:4px">${generatedPassword}</code></div>` +
            (mobileNumber ? `<div style="margin-top:8px"><strong>Mobile (alternate login):</strong> ${mobileNumber}</div>` : "") +
            `</div>` +
            `<p>Use these credentials to log in to i-icon Academy.</p>` +
            `<p style="font-size:12px;color:#94a3b8;margin-top:24px">— i-icon Academy team</p>` +
            `</div>`;
          const channels: Array<"email" | "whatsapp"> = [];
          if (req.email) channels.push("email");
          if (mobileNumber) channels.push("whatsapp");
          if (channels.length) {
            createAndSendNotification({
              recipient: { id: school.id, email: req.email ?? "", mobile_number: mobileNumber, name: userName },
              channels,
              type: "credential_delivery",
              subject: "Your i-icon Academy school/college account is ready",
              message: text,
              html
            }).catch(err => console.error("[onboarding] credential notification failed:", (err as Error).message));
          }
        }

        req.status = "approved";
        req.approved_at = new Date();
        await req.save();
        return {
          ...serializeDoc(req.toObject()),
          school: serializeDoc(school.toObject()),
          generatedEmail,
          generatedPassword
        };
      }

      req.status = body.status;
      if (body.status === "approved") req.approved_at = new Date();
      if (body.rejection_reason || body.rejectionReason) {
        req.rejection_reason = body.rejection_reason ?? body.rejectionReason;
      }
      await req.save();
      return serializeDoc(req.toObject());
    }
  );

  app.get("/api/userRequests", { preHandler: requireAuth }, async (request) => {
    const query = z.object({ school_id: z.string().optional(), schoolId: z.string().optional() }).parse(request.query);
    const sid = query.school_id ?? query.schoolId;
    const rows = await UserRequest.find(sid ? { school_id: sid } : {}).sort({ created: -1 }).lean();
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)));
  });

  app.post("/api/userRequests", { preHandler: requireAuth }, async (request) => {
    const body = z
      .object({
        school_id: z.string(),
        requested_user_name: z.string(),
        requested_user_email: z.string().email(),
        requested_user_mobile: z.string().optional()
      })
      .parse(request.body);
    return UserRequest.create(body);
  });

  app.patch(
    "/api/userRequests/:req_id",
    { preHandler: requireRole(["admin", "platform_admin", "school_admin"]) },
    async (request, reply) => {
      const params = z.object({ req_id: z.string() }).parse(request.params);
      const body = z.object({ status: z.string(), rejection_reason: z.string().optional() }).parse(request.body);
      const updated = await UserRequest.findOneAndUpdate(
        { id: params.req_id },
        { $set: { ...body, approved_at: body.status === "approved" ? new Date() : null } },
        { new: true }
      );
      if (!updated) return reply.status(404).send({ detail: "Request not found" });
      return updated;
    }
  );
};
