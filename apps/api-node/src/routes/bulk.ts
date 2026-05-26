import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { User } from "../models/index.js";
import { hashPassword } from "../lib/auth.js";
import { genPassword } from "../lib/schools.js";
import { PLATFORM_ROLES } from "../lib/permissions.js";
import { requireRole } from "../plugins/auth.js";

const platformRoles = new Set<string>(PLATFORM_ROLES);

export const registerBulkRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/bulk/users", { preHandler: requireRole(["admin", "platform_admin", "school_admin"]) }, async (request) => {
    const body = z
      .object({
        users: z.array(
          z.object({
            email: z.string().email(),
            password: z.string().min(6).optional(),
            name: z.string(),
            role: z.string().optional(),
            school_id: z.string().nullable().optional(),
            schoolId: z.string().nullable().optional(),
            mobileNumber: z.string().optional(),
            mobile_number: z.string().optional()
          })
        )
      })
      .parse(request.body);

    const results = [];
    for (const row of body.users) {
      try {
        const role = row.role ?? "school_viewer";
        const password = row.password ?? genPassword();
        const schoolId = platformRoles.has(role) ? null : (row.school_id ?? row.schoolId ?? null);
        const user = await User.create({
          email: row.email.toLowerCase(),
          name: row.name,
          role,
          school_id: schoolId,
          mobile_number: row.mobile_number ?? row.mobileNumber,
          password_hash: await hashPassword(password),
          must_change_password: true
        });
        results.push({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolId: user.school_id,
          generatedPassword: password,
          status: "created"
        });
      } catch (error) {
        results.push({ email: row.email, name: row.name, status: "error", error: (error as Error).message });
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    return { results, total: results.length, created, created_count: created };
  });
};
