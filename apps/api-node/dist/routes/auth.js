import { z } from "zod";
import { AuthToken, User } from "../models/index.js";
import { authReply, hashPassword, hashToken, issueRefreshToken, randomToken, resolveSchoolName, revokeActiveRefreshTokens, signAccessToken, verifyPassword } from "../lib/auth.js";
import { writeAudit } from "../lib/audit.js";
import { isSuperAdmin } from "../lib/permissions.js";
import { getCurrentUser, requireAuth } from "../plugins/auth.js";
import { env } from "../config/env.js";
import { createAndSendNotification } from "../services/notificationChannels.js";
// 'identifier' accepts email or mobile number; 'email' kept as legacy alias.
const LoginSchema = z.object({
    identifier: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(1)
});
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const escapeHtml = (s) => s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
export const registerAuthRoutes = async (app) => {
    app.post("/api/auth/login", async (request, reply) => {
        const raw = LoginSchema.parse(request.body);
        const identifier = (raw.identifier ?? raw.email ?? "").trim();
        if (!identifier)
            return reply.status(400).send({ detail: "Email or mobile number is required" });
        // Route lookup: email format → by email field; otherwise treat as mobile number.
        const isEmail = identifier.includes("@");
        let user;
        if (isEmail) {
            user = await User.findOne({ email: identifier.toLowerCase() });
        }
        else {
            // Strip all non-digit characters so "+91-9876543210", "9876543210", "09876543210" all resolve.
            const digits = identifier.replace(/\D/g, "");
            // Match stored mobile_number values that end with the supplied digit string.
            user = await User.findOne({ mobile_number: { $regex: new RegExp(digits.replace(/^0+/, "") + "$") } });
        }
        if (!user) {
            return reply.status(400).send({ detail: "Invalid email or password" });
        }
        const now = new Date();
        if (!user.is_active) {
            return reply.status(403).send({ detail: "Account is deactivated" });
        }
        if (user.locked_until && user.locked_until > now) {
            return reply.status(403).send({ detail: "Account is temporarily locked" });
        }
        const ok = await verifyPassword(raw.password, user.password_hash);
        if (!ok) {
            user.login_attempts = (user.login_attempts ?? 0) + 1;
            if (user.login_attempts >= MAX_ATTEMPTS) {
                user.locked_until = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000);
                user.login_attempts = 0;
            }
            await user.save();
            await writeAudit({
                user_id: user.id,
                action: "login_failed",
                action_details: "Invalid password",
                request
            });
            return reply.status(400).send({ detail: "Invalid email or password" });
        }
        if (!user.verified && !isSuperAdmin(user.role)) {
            return reply.status(403).send({ detail: "Account is not verified" });
        }
        await revokeActiveRefreshTokens(user.id);
        const refresh = await issueRefreshToken(user.id, request);
        user.last_login = now;
        user.login_count = (user.login_count ?? 0) + 1;
        user.login_attempts = 0;
        user.locked_until = undefined;
        user.last_device = String(request.headers["user-agent"] ?? "").slice(0, 500);
        await user.save();
        await writeAudit({ user_id: user.id, action: "login", request });
        const access = signAccessToken(request, user);
        const schoolName = await resolveSchoolName(user.school_id);
        return authReply(user, access, refresh, schoolName);
    });
    app.post("/api/auth/refresh", async (request, reply) => {
        const body = z.object({ refreshToken: z.string().min(1) }).parse(request.body);
        const token = await AuthToken.findOne({
            token_hash: hashToken(body.refreshToken),
            token_type: "refresh"
        });
        if (!token ||
            token.revoked_at ||
            token.used_at ||
            token.expires_at < new Date()) {
            return reply.status(401).send({ detail: "Invalid refresh token" });
        }
        const user = await User.findOne({ id: token.user_id, is_active: true });
        if (!user)
            return reply.status(401).send({ detail: "Invalid refresh token" });
        token.revoked_at = new Date();
        await token.save();
        const refresh = await issueRefreshToken(user.id, request);
        const access = signAccessToken(request, user);
        const schoolName = await resolveSchoolName(user.school_id);
        return { ...authReply(user, access, refresh, schoolName) };
    });
    app.post("/api/auth/forgot-password", async (request) => {
        const body = z.object({ email: z.string().email() }).parse(request.body);
        const user = await User.findOne({ email: body.email });
        // Generic response on purpose — never leak which addresses exist.
        const genericResponse = { message: "If this account exists, reset instructions were sent." };
        if (!user)
            return genericResponse;
        const raw = randomToken();
        await AuthToken.updateMany({ user_id: user.id, token_type: "password_reset", used_at: null }, { $set: { revoked_at: new Date() } });
        await AuthToken.create({
            user_id: user.id,
            token_hash: hashToken(raw),
            token_type: "password_reset",
            expires_at: new Date(Date.now() + 60 * 60 * 1000)
        });
        const resetUrl = `${env.APP_BASE_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(raw)}`;
        const subject = "Reset your i-icon Academy password";
        const text = `Hi ${user.name || ""},\n\n` +
            `We received a request to reset the password for ${user.email}.\n\n` +
            `Click the link below to choose a new password. The link expires in 60 minutes.\n\n` +
            `${resetUrl}\n\n` +
            `If you didn't request this, you can safely ignore this email — your password will stay the same.\n\n` +
            `— i-icon Academy team`;
        const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">` +
            `<h2 style="margin:0 0 16px;color:#4338ca">Reset your password</h2>` +
            `<p>Hi ${escapeHtml(user.name || "there")},</p>` +
            `<p>We received a request to reset the password for <strong>${escapeHtml(user.email)}</strong>.</p>` +
            `<p style="text-align:center;margin:32px 0">` +
            `<a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Reset password</a>` +
            `</p>` +
            `<p style="font-size:12px;color:#64748b">This link expires in 60 minutes. If you didn't ask for a reset, you can ignore this email.</p>` +
            `<p style="font-size:12px;color:#94a3b8;margin-top:24px">Or paste this link into your browser:<br/>${resetUrl}</p>` +
            `</div>`;
        // Fan-out: in-app + email always, WhatsApp if the user has a mobile number on file.
        const channels = ["email"];
        if (user.mobile_number)
            channels.push("whatsapp");
        await createAndSendNotification({
            recipient: { id: user.id, email: user.email, mobile_number: user.mobile_number, name: user.name },
            channels,
            type: "password_reset",
            subject,
            message: text,
            html
        });
        await writeAudit({
            user_id: user.id,
            action: "password_reset_requested",
            action_details: `Reset link sent for ${user.email}`,
            request
        });
        return genericResponse;
    });
    app.post("/api/auth/reset-password", async (request, reply) => {
        const body = z
            .object({ token: z.string(), password: z.string().min(6), newPassword: z.string().min(6).optional() })
            .parse(request.body);
        const newPass = body.newPassword ?? body.password;
        const token = await AuthToken.findOne({
            token_hash: hashToken(body.token),
            token_type: "password_reset",
            used_at: null,
            revoked_at: null
        });
        if (!token || token.expires_at < new Date()) {
            return reply.status(400).send({ detail: "Token invalid or expired" });
        }
        const user = await User.findOne({ id: token.user_id });
        if (!user)
            return reply.status(404).send({ detail: "User not found" });
        user.password_hash = await hashPassword(newPass);
        user.must_change_password = false;
        await user.save();
        token.used_at = new Date();
        await token.save();
        await revokeActiveRefreshTokens(user.id);
        // Confirmation notification — email + in-app. Helps users notice
        // unexpected resets if their account was compromised.
        await createAndSendNotification({
            recipient: { id: user.id, email: user.email, mobile_number: user.mobile_number, name: user.name },
            channels: ["email"],
            type: "password_reset_confirmed",
            subject: "Your i-icon Academy password was changed",
            message: `Hi ${user.name || ""},\n\n` +
                `Your i-icon Academy password was just reset. If this wasn't you, please contact your administrator immediately.\n\n` +
                `— i-icon Academy team`
        });
        await writeAudit({
            user_id: user.id,
            action: "password_reset_completed",
            request
        });
        return { message: "Password reset successful" };
    });
    app.post("/api/auth/send-verification", async (request, reply) => {
        const body = z.object({ email: z.string().email() }).parse(request.body);
        const user = await User.findOne({ email: body.email });
        if (!user)
            return reply.status(404).send({ detail: "User not found" });
        const raw = randomToken();
        await AuthToken.create({
            user_id: user.id,
            token_hash: hashToken(raw),
            token_type: "email_verification",
            expires_at: new Date(Date.now() + 24 * 3600 * 1000)
        });
        return { message: "Verification token generated", token: raw };
    });
    app.post("/api/auth/verify-email", async (request, reply) => {
        const body = z.object({ token: z.string() }).parse(request.body);
        const token = await AuthToken.findOne({
            token_hash: hashToken(body.token),
            token_type: "email_verification",
            used_at: null,
            revoked_at: null
        });
        if (!token || token.expires_at < new Date()) {
            return reply.status(400).send({ detail: "Token invalid or expired" });
        }
        const user = await User.findOne({ id: token.user_id });
        if (!user)
            return reply.status(404).send({ detail: "User not found" });
        user.verified = true;
        await user.save();
        token.used_at = new Date();
        await token.save();
        return { message: "Email verified" };
    });
    app.post("/api/auth/logout", { preHandler: requireAuth }, async (request) => {
        const body = z.object({ refreshToken: z.string().optional() }).parse(request.body ?? {});
        if (body.refreshToken) {
            await AuthToken.updateMany({ token_hash: hashToken(body.refreshToken), token_type: "refresh" }, { $set: { revoked_at: new Date() } });
        }
        if (request.authUser?.sub) {
            await writeAudit({ user_id: request.authUser.sub, action: "logout", request });
        }
        return { message: "Logged out" };
    });
    app.get("/api/auth/me", { preHandler: requireAuth }, async (request, reply) => {
        const user = await getCurrentUser(request, reply);
        if (!user)
            return;
        const schoolName = await resolveSchoolName(user.school_id);
        return authReply(user, "", "", schoolName).record;
    });
    app.patch("/api/auth/me", { preHandler: requireAuth }, async (request, reply) => {
        const user = await getCurrentUser(request, reply);
        if (!user)
            return;
        const contentType = request.headers["content-type"] ?? "";
        if (contentType.includes("multipart/form-data")) {
            const parts = request.parts();
            for await (const part of parts) {
                if (part.type === "file" && part.fieldname === "avatar") {
                    const buf = await part.toBuffer();
                    const mime = part.mimetype || "image/png";
                    user.avatar = `data:${mime};base64,${buf.toString("base64")}`;
                }
                else if (part.type === "field") {
                    const val = String(part.value);
                    if (part.fieldname === "name")
                        user.name = val;
                    if (part.fieldname === "mobile_number" || part.fieldname === "mobileNumber")
                        user.mobile_number = val;
                    if (part.fieldname === "address")
                        user.address = val;
                }
            }
            await user.save();
            const schoolName = await resolveSchoolName(user.school_id);
            return authReply(user, "", "", schoolName).record;
        }
        const body = z
            .object({
            name: z.string().optional(),
            mobile_number: z.string().optional(),
            mobileNumber: z.string().optional(),
            address: z.string().optional(),
            avatar: z.string().optional(),
            notification_preferences: z
                .object({ email: z.boolean().optional(), whatsapp: z.boolean().optional() })
                .optional(),
            notificationPreferences: z
                .object({ email: z.boolean().optional(), whatsapp: z.boolean().optional() })
                .optional()
        })
            .parse(request.body ?? {});
        if (body.name !== undefined)
            user.name = body.name;
        if (body.mobile_number !== undefined)
            user.mobile_number = body.mobile_number;
        if (body.mobileNumber !== undefined)
            user.mobile_number = body.mobileNumber;
        if (body.address !== undefined)
            user.address = body.address;
        if (body.avatar !== undefined)
            user.avatar = body.avatar;
        const prefs = body.notification_preferences ?? body.notificationPreferences;
        if (prefs !== undefined) {
            user.notification_preferences = {
                ...(user.notification_preferences ?? {}),
                ...prefs
            };
        }
        await user.save();
        const schoolName = await resolveSchoolName(user.school_id);
        return authReply(user, "", "", schoolName).record;
    });
    app.post("/api/auth/change-password", { preHandler: requireAuth }, async (request, reply) => {
        const user = await getCurrentUser(request, reply);
        if (!user)
            return;
        const body = z
            .object({
            current_password: z.string().optional(),
            currentPassword: z.string().optional(),
            new_password: z.string().min(6).optional(),
            newPassword: z.string().min(6).optional()
        })
            .parse(request.body);
        const current = body.current_password ?? body.currentPassword ?? "";
        const newPass = body.new_password ?? body.newPassword ?? "";
        const ok = await verifyPassword(current, user.password_hash);
        if (!ok)
            return reply.status(400).send({ detail: "Current password is incorrect" });
        user.password_hash = await hashPassword(newPass);
        user.must_change_password = false;
        await user.save();
        await revokeActiveRefreshTokens(user.id);
        await createAndSendNotification({
            recipient: { id: user.id, email: user.email, mobile_number: user.mobile_number, name: user.name },
            channels: ["email"],
            type: "password_changed",
            subject: "Your i-icon Academy password was changed",
            message: `Hi ${user.name || ""},\n\n` +
                `This is a confirmation that you successfully changed the password on your i-icon Academy account.\n\n` +
                `If you did not perform this change, please contact your administrator immediately.\n\n` +
                `— i-icon Academy team`
        });
        return { message: "Password changed" };
    });
};
