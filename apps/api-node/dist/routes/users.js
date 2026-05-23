import { z } from "zod";
import { User } from "../models/index.js";
import { hashPassword } from "../lib/auth.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
export const registerUserRoutes = async (app) => {
    app.get("/api/users", { preHandler: requireAuth }, async (request) => {
        const query = z
            .object({ school_id: z.string().optional(), role: z.string().optional(), is_active: z.coerce.boolean().optional() })
            .parse(request.query);
        const filter = {};
        if (query.school_id)
            filter.school_id = query.school_id;
        if (query.role)
            filter.role = query.role;
        if (query.is_active !== undefined)
            filter.is_active = query.is_active;
        return User.find(filter).sort({ created: -1 });
    });
    app.get("/api/users/:user_id", { preHandler: requireAuth }, async (request, reply) => {
        const params = z.object({ user_id: z.string() }).parse(request.params);
        const user = await User.findOne({ id: params.user_id });
        if (!user)
            return reply.status(404).send({ detail: "User not found" });
        return user;
    });
    app.post("/api/users", { preHandler: requireRole(["admin", "platform_admin", "school_admin"]) }, async (request) => {
        const body = z
            .object({
            email: z.string().email(),
            password: z.string().min(6),
            name: z.string(),
            role: z.string().optional(),
            school_id: z.string().nullable().optional(),
            mobile_number: z.string().optional(),
            address: z.string().optional()
        })
            .parse(request.body);
        const password_hash = await hashPassword(body.password);
        return User.create({
            ...body,
            school_id: body.school_id ?? null,
            role: body.role ?? "school_viewer",
            password_hash
        });
    });
    app.patch("/api/users/:user_id", { preHandler: requireAuth }, async (request, reply) => {
        const params = z.object({ user_id: z.string() }).parse(request.params);
        const body = z
            .object({
            name: z.string().optional(),
            role: z.string().optional(),
            school_id: z.string().nullable().optional(),
            mobile_number: z.string().optional(),
            address: z.string().optional(),
            is_active: z.boolean().optional(),
            verified: z.boolean().optional()
        })
            .parse(request.body);
        const updated = await User.findOneAndUpdate({ id: params.user_id }, { $set: { ...body, school_id: body.school_id ?? undefined } }, { new: true });
        if (!updated)
            return reply.status(404).send({ detail: "User not found" });
        return updated;
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
        const body = z.object({ new_password: z.string().min(6) }).parse(request.body);
        const password_hash = await hashPassword(body.new_password);
        const updated = await User.findOneAndUpdate({ id: params.user_id }, { $set: { password_hash } }, { new: true });
        if (!updated)
            return reply.status(404).send({ detail: "User not found" });
        return { message: "Password reset successful" };
    });
};
