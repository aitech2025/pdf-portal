import crypto from "node:crypto";
import { z } from "zod";
import { School, User } from "../models/index.js";
import { hashPassword } from "../lib/auth.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission, requireRole } from "../plugins/auth.js";
import { PERMISSIONS, PLATFORM_ROLES } from "../lib/permissions.js";
import { createAndSendNotification } from "../services/notificationChannels.js";
const platformRoleSet = new Set(PLATFORM_ROLES);
const genPassword = (length = 12) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
    let out = "";
    for (let i = 0; i < length; i++)
        out += chars[crypto.randomInt(chars.length)];
    return out;
};
const sendUserCredentialNotifications = async (user, schoolName, password, channels = ["email", "whatsapp"]) => {
    const subject = "Welcome to i-icon Academy — your account is ready";
    const text = `Dear ${user.name},\n\n` +
        `Your account at ${schoolName} on i-icon Academy has been created.\n\n` +
        `Login credentials:\n` +
        `  Email: ${user.email}\n` +
        `  Password: ${password}\n\n` +
        `Use these credentials to log in to i-icon Academy.\n\n` +
        `— i-icon Academy team`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">` +
        `<h2 style="margin:0 0 16px;color:#4338ca">Welcome to i-icon Academy</h2>` +
        `<p>Dear ${user.name},</p>` +
        `<p>Your account at <strong>${schoolName}</strong> has been created.</p>` +
        `<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0">` +
        `<div><strong>Email:</strong> ${user.email}</div>` +
        `<div><strong>Password:</strong> <code style="font-family:monospace;background:#fff;padding:2px 6px;border-radius:4px">${password}</code></div>` +
        `</div>` +
        `<p>Use these credentials to log in to i-icon Academy.</p>` +
        `<p style="font-size:12px;color:#94a3b8;margin-top:24px">— i-icon Academy team</p>` +
        `</div>`;
    // Filter out WhatsApp if the user has no mobile number to avoid pointless failures.
    const effectiveChannels = channels.filter((c) => (c === "whatsapp" ? !!user.mobile_number : true));
    await createAndSendNotification({
        recipient: user,
        channels: effectiveChannels,
        type: "credential_delivery",
        subject,
        message: text,
        html
    });
};
export const registerUserRoutes = async (app) => {
    app.get("/api/users", { preHandler: requireAuth }, async (request) => {
        const query = z
            .object({
            school_id: z.string().optional(),
            schoolId: z.string().optional(),
            role: z.string().optional(),
            is_active: z.coerce.boolean().optional(),
            isActive: z.coerce.boolean().optional(),
            page: z.coerce.number().default(1),
            per_page: z.coerce.number().default(50),
            sort: z.string().optional(),
            q: z.string().optional()
        })
            .parse(request.query);
        const filter = {};
        const schoolId = query.schoolId ?? query.school_id;
        if (schoolId)
            filter.school_id = schoolId;
        if (query.role)
            filter.role = query.role;
        const isActive = query.is_active ?? query.isActive;
        if (isActive !== undefined)
            filter.is_active = isActive;
        if (query.q) {
            const regex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [{ name: regex }, { email: regex }];
        }
        const sortField = query.sort?.replace(/^-/, "") === "created"
            ? "created"
            : query.sort?.replace(/^-/, "") === "name"
                ? "name"
                : "created";
        const sortDir = query.sort?.startsWith("-") ? -1 : -1;
        const skip = (query.page - 1) * query.per_page;
        const [rows, total] = await Promise.all([
            User.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(query.per_page).lean(),
            User.countDocuments(filter)
        ]);
        return listResponse(rows.map((r) => serializeDoc(r)), total);
    });
    app.get("/api/users/:user_id", { preHandler: requireAuth }, async (request, reply) => {
        const params = z.object({ user_id: z.string() }).parse(request.params);
        const user = await User.findOne({ id: params.user_id }).lean();
        if (!user)
            return reply.status(404).send({ detail: "User not found" });
        return serializeDoc(user);
    });
    app.post("/api/users", { preHandler: requirePermission(PERMISSIONS.USER_MANAGE) }, async (request, reply) => {
        const body = z
            .object({
            email: z.string().email(),
            password: z.string().min(6).optional(),
            name: z.string(),
            role: z.string().optional(),
            school_id: z.string().nullable().optional(),
            schoolId: z.string().nullable().optional(),
            mobile_number: z.string().optional(),
            mobileNumber: z.string().optional(),
            address: z.string().optional(),
            sendCredentials: z.boolean().optional(),
            send_credentials: z.boolean().optional()
        })
            .parse(request.body);
        const role = body.role ?? "school_viewer";
        // Platform roles must never have a school assignment
        const requestedSchoolId = body.schoolId ?? body.school_id ?? null;
        const schoolId = platformRoleSet.has(role) ? null : requestedSchoolId;
        if (!platformRoleSet.has(role) && !schoolId) {
            return reply.status(400).send({ detail: `Role '${role}' must be assigned to a school` });
        }
        const existing = await User.findOne({ email: body.email.toLowerCase() }).lean();
        if (existing)
            return reply.status(409).send({ detail: "A user with this email already exists" });
        const password = body.password ?? genPassword();
        const password_hash = await hashPassword(password);
        const mobile_number = body.mobileNumber ?? body.mobile_number;
        const user = await User.create({
            email: body.email.toLowerCase(),
            name: body.name,
            mobile_number,
            address: body.address,
            role,
            school_id: schoolId,
            password_hash,
            is_active: true,
            verified: true,
            must_change_password: false
        });
        const sendCreds = body.sendCredentials ?? body.send_credentials ?? !platformRoleSet.has(role);
        if (sendCreds && schoolId) {
            const school = await School.findOne({ id: schoolId }).lean();
            await sendUserCredentialNotifications({ id: user.id, name: user.name, email: user.email, mobile_number: user.mobile_number }, school?.school_name ?? "your school", password);
        }
        return {
            ...serializeDoc(user.toObject()),
            generatedPassword: body.password ? undefined : password
        };
    });
    app.patch("/api/users/:user_id", { preHandler: requireAuth }, async (request, reply) => {
        const params = z.object({ user_id: z.string() }).parse(request.params);
        const body = z
            .object({
            name: z.string().optional(),
            role: z.string().optional(),
            school_id: z.string().nullable().optional(),
            schoolId: z.string().nullable().optional(),
            mobile_number: z.string().optional(),
            mobileNumber: z.string().optional(),
            address: z.string().optional(),
            is_active: z.boolean().optional(),
            isActive: z.boolean().optional(),
            verified: z.boolean().optional()
        })
            .parse(request.body);
        const update = {};
        if (body.name !== undefined)
            update.name = body.name;
        if (body.role !== undefined)
            update.role = body.role;
        if (body.mobile_number !== undefined)
            update.mobile_number = body.mobile_number;
        if (body.mobileNumber !== undefined)
            update.mobile_number = body.mobileNumber;
        if (body.address !== undefined)
            update.address = body.address;
        if (body.is_active !== undefined)
            update.is_active = body.is_active;
        if (body.isActive !== undefined)
            update.is_active = body.isActive;
        if (body.verified !== undefined)
            update.verified = body.verified;
        // If role is being changed to a platform role, force school_id to null.
        if (body.role && platformRoleSet.has(body.role)) {
            update.school_id = null;
        }
        else if (body.schoolId !== undefined) {
            update.school_id = body.schoolId;
        }
        else if (body.school_id !== undefined) {
            update.school_id = body.school_id;
        }
        const updated = await User.findOneAndUpdate({ id: params.user_id }, { $set: update }, { new: true }).lean();
        if (!updated)
            return reply.status(404).send({ detail: "User not found" });
        return serializeDoc(updated);
    });
    app.delete("/api/users/:user_id", { preHandler: requireRole(["admin", "platform_admin", "school_admin"]) }, async (request, reply) => {
        const params = z.object({ user_id: z.string() }).parse(request.params);
        const deleted = await User.findOneAndDelete({ id: params.user_id });
        if (!deleted)
            return reply.status(404).send({ detail: "User not found" });
        return { message: "User deleted" };
    });
    app.post("/api/users/:user_id/reset-password", { preHandler: requireRole(["admin", "platform_admin", "school_admin"]) }, async (request, reply) => {
        const params = z.object({ user_id: z.string() }).parse(request.params);
        const body = z
            .object({
            new_password: z.string().min(6).optional(),
            newPassword: z.string().min(6).optional(),
            sendVia: z.enum(["email", "whatsapp", "both", "manual"]).optional()
        })
            .parse(request.body ?? {});
        const user = await User.findOne({ id: params.user_id });
        if (!user)
            return reply.status(404).send({ detail: "User not found" });
        const newPassword = body.new_password ?? body.newPassword ?? genPassword();
        const password_hash = await hashPassword(newPassword);
        user.password_hash = password_hash;
        user.must_change_password = true;
        user.login_attempts = 0;
        user.locked_until = undefined;
        await user.save();
        const sendVia = body.sendVia ?? "manual";
        const channels = sendVia === "email"
            ? ["email"]
            : sendVia === "whatsapp"
                ? ["whatsapp"]
                : sendVia === "both"
                    ? ["email", "whatsapp"]
                    : [];
        if (channels.length) {
            const schoolName = user.school_id
                ? (await School.findOne({ id: user.school_id }).lean())?.school_name ?? "your school"
                : "i-icon Academy";
            await sendUserCredentialNotifications({
                id: user.id,
                name: user.name,
                email: user.email,
                mobile_number: user.mobile_number
            }, schoolName, newPassword, channels);
        }
        return {
            message: "Password reset successful",
            generatedPassword: newPassword,
            sentVia: sendVia,
            userEmail: user.email,
            userName: user.name
        };
    });
};
