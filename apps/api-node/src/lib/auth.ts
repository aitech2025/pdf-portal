import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserDoc } from "../models/index.js";

export const hashPassword = async (password: string): Promise<string> => bcrypt.hash(password, 10);

export const verifyPassword = async (plain: string, hashed: string): Promise<boolean> =>
  bcrypt.compare(plain, hashed);

export const randomToken = (): string => crypto.randomBytes(36).toString("base64url");

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export type AuthUserPayload = {
  sub: string;
  role: string;
  school_id: string | null;
};

export const signAccessToken = (request: FastifyRequest, user: UserDoc): string =>
  request.server.jwt.sign(
    {
      sub: user.id,
      role: user.role,
      school_id: user.school_id ?? null
    },
    {
      expiresIn: "60m"
    }
  );

export const authReply = (user: UserDoc, token: string, refreshToken: string, schoolName: string | null = null) => ({
  token,
  refreshToken,
  record: {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    schoolId: user.school_id ?? null,
    school_id: user.school_id ?? null,
    schoolName: schoolName,
    school_name: schoolName,
    isActive: user.is_active,
    is_active: user.is_active,
    verified: user.verified,
    mustChangePassword: user.must_change_password ?? false,
    must_change_password: user.must_change_password ?? false,
    mobileNumber: user.mobile_number ?? null,
    mobile_number: user.mobile_number ?? null,
    avatar: user.avatar ?? null,
    address: user.address ?? null
  }
});

export const resolveSchoolName = async (schoolId: string | null | undefined): Promise<string | null> => {
  if (!schoolId) return null;
  const { School } = await import("../models/index.js");
  const school = await School.findOne({ id: schoolId }).lean();
  return school?.school_name ?? null;
};

export const revokeActiveRefreshTokens = async (userId: string): Promise<void> => {
  const { AuthToken } = await import("../models/index.js");
  await AuthToken.updateMany(
    {
      user_id: userId,
      token_type: "refresh",
      revoked_at: null,
      expires_at: { $gt: new Date() }
    },
    { $set: { revoked_at: new Date() } }
  );
};

export const issueRefreshToken = async (
  userId: string,
  request?: { ip?: string; headers?: { [key: string]: string | string[] | undefined } }
): Promise<string> => {
  const { AuthToken } = await import("../models/index.js");
  const raw = randomToken();
  await AuthToken.create({
    user_id: userId,
    token_hash: hashToken(raw),
    token_type: "refresh",
    expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    ip_address: request?.ip,
    user_agent: (request?.headers?.["user-agent"] as string) ?? ""
  });
  return raw;
};

export const forbidden = (reply: FastifyReply, detail = "Insufficient permissions") =>
  reply.status(403).send({ detail });
