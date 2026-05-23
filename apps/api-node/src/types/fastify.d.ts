import type { AuthUserPayload } from "../lib/auth.js";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUserPayload;
  }
}
