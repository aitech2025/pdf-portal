import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Notification, School, User } from "../models/index.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { pushNotification } from "../services/realtime.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";

const SCHOOL_ROLES = ["school", "school_admin", "school_viewer", "teacher"];

export const registerNotificationRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/notifications", { preHandler: requireAuth }, async (request) => {
    const userId = request.authUser?.sub;
    const query = z
      .object({
        recipient_id: z.string().optional(),
        recipientId: z.string().optional(),
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(50)
      })
      .parse(request.query);

    const recipientId = query.recipient_id ?? query.recipientId ?? userId;
    const skip = (query.page - 1) * query.per_page;
    const filter = { recipient_id: recipientId };

    const [rows, total] = await Promise.all([
      Notification.find(filter).sort({ created: -1 }).skip(skip).limit(query.per_page).lean(),
      Notification.countDocuments(filter)
    ]);

    return listResponse(
      rows.map((r) => serializeDoc(r as Record<string, unknown>)),
      total
    );
  });

  app.post("/api/notifications", { preHandler: requireAuth }, async (request) => {
    const body = z
      .object({
        recipient_id: z.string().optional(),
        recipientId: z.string().optional(),
        type: z.string(),
        subject: z.string(),
        message: z.string(),
        notification_method: z.string().optional(),
        notificationMethod: z.string().optional()
      })
      .parse(request.body);
    const notif = await Notification.create({
      recipient_id: body.recipient_id ?? body.recipientId,
      type: body.type,
      subject: body.subject,
      message: body.message,
      notification_method: body.notification_method ?? body.notificationMethod ?? "in_app",
      status: "sent"
    });
    pushNotification(notif.recipient_id, serializeDoc(notif.toObject()));
    return serializeDoc(notif.toObject());
  });

  app.post(
    "/api/notifications/admin/send",
    { preHandler: requirePermission(PERMISSIONS.NOTIFICATION_SEND) },
    async (request, reply) => {
      const body = z
        .object({
          subject: z.string().min(1),
          message: z.string().min(1),
          type: z.string().default("bulk_announcement"),
          channels: z.array(z.string()).default(["in_app"]),
          targetMode: z.enum(["all_schools", "selected_schools", "selected_users"]).default("all_schools"),
          target: z.enum(["all", "schools"]).optional(),
          schoolIds: z.array(z.string()).optional(),
          school_ids: z.array(z.string()).optional(),
          userIds: z.array(z.string()).optional()
        })
        .parse(request.body);

      const channels = body.channels.map((c) => c.toLowerCase());
      const targetMode =
        body.targetMode ??
        (body.target === "schools" ? "selected_schools" : body.target === "all" ? "all_schools" : "all_schools");
      const schoolIds = body.schoolIds ?? body.school_ids ?? [];

      let userQuery: Record<string, unknown> = { is_active: true, role: { $in: SCHOOL_ROLES } };

      if (targetMode === "selected_schools") {
        if (!schoolIds.length) {
          return reply.status(400).send({ detail: "schoolIds required for selected schools" });
        }
        userQuery = { ...userQuery, school_id: { $in: schoolIds } };
      } else if (targetMode === "selected_users") {
        const userIds = body.userIds ?? [];
        if (!userIds.length) {
          return reply.status(400).send({ detail: "userIds required for selected users" });
        }
        userQuery = { ...userQuery, id: { $in: userIds } };
      }

      const recipients = await User.find(userQuery).lean();
      if (!recipients.length) {
        return { totalRecipients: 0, created: 0, sent: 0, failed: 0, errors: [] };
      }

      const schoolMap = new Map<string, { school_name: string }>();
      const schoolIdsNeeded = [...new Set(recipients.map((u) => u.school_id).filter(Boolean))] as string[];
      if (schoolIdsNeeded.length) {
        const schools = await School.find({ id: { $in: schoolIdsNeeded } }).lean();
        for (const s of schools) schoolMap.set(s.id, s);
      }

      let created = 0;
      let sent = 0;
      let failed = 0;
      const errors: Array<{ recipientId: string; channel: string; error: string }> = [];

      for (const user of recipients) {
        const schoolName = user.school_id ? schoolMap.get(user.school_id)?.school_name ?? "your school" : "your school";
        const personalizedMessage = body.message.replace(/\{SchoolName\}/g, schoolName);
        const personalizedSubject = body.subject.replace(/\{SchoolName\}/g, schoolName);

        for (const channel of channels) {
          let status = "pending";
          let error: string | null = null;

          if (channel === "in_app") {
            status = "sent";
          } else if (channel === "email") {
            if (user.email) {
              status = "sent";
            } else {
              status = "failed";
              error = "User email not available";
            }
          } else if (channel === "whatsapp") {
            status = user.mobile_number ? "sent" : "failed";
            if (!user.mobile_number) error = "Mobile number not available";
          } else {
            status = "failed";
            error = `Unsupported channel: ${channel}`;
          }

          const notif = await Notification.create({
            recipient_id: user.id,
            type: body.type,
            subject: personalizedSubject,
            message: personalizedMessage,
            notification_method: channel,
            status,
            read: false
          });

          created += 1;
          if (status === "sent") {
            sent += 1;
            if (channel === "in_app") {
              pushNotification(user.id, serializeDoc(notif.toObject()));
            }
          } else {
            failed += 1;
            if (error && errors.length < 10) {
              errors.push({ recipientId: user.id, channel, error });
            }
          }
        }
      }

      return {
        totalRecipients: recipients.length,
        created,
        sent,
        failed,
        errors
      };
    }
  );

  app.patch("/api/notifications/:notif_id", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ notif_id: z.string() }).parse(request.params);
    const body = z
      .object({
        read: z.boolean().optional(),
        status: z.string().optional()
      })
      .parse(request.body);
    const update: Record<string, unknown> = {};
    if (body.read !== undefined) {
      update.read = body.read;
      if (body.read) update.status = "sent";
    }
    if (body.status !== undefined) update.status = body.status;
    const updated = await Notification.findOneAndUpdate({ id: params.notif_id }, { $set: update }, { new: true });
    if (!updated) return reply.status(404).send({ detail: "Notification not found" });
    return serializeDoc(updated.toObject());
  });

  app.delete("/api/notifications/:notif_id", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ notif_id: z.string() }).parse(request.params);
    const deleted = await Notification.findOneAndDelete({ id: params.notif_id });
    if (!deleted) return reply.status(404).send({ detail: "Notification not found" });
    return { message: "Notification deleted" };
  });
};
