import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { User } from "../models/index.js";
import { hashPassword } from "../lib/auth.js";
import { requireRole } from "../plugins/auth.js";

export const registerBulkRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/bulk/users", { preHandler: requireRole(["admin", "platform_admin", "school_admin"]) }, async (request) => {
    const body = z
      .object({
        users: z.array(
          z.object({
            email: z.string().email(),
            password: z.string().min(6),
            name: z.string(),
            role: z.string().optional(),
            school_id: z.string().nullable().optional()
          })
        )
      })
      .parse(request.body);

    const payload = await Promise.all(
      body.users.map(async (u) => ({
        email: u.email,
        name: u.name,
        role: u.role ?? "school_viewer",
        school_id: u.school_id ?? null,
        password_hash: await hashPassword(u.password)
      }))
    );
    const created = await User.insertMany(payload, { ordered: false });
    return { created_count: created.length };
  });
};
