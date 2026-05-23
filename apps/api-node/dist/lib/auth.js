import bcrypt from "bcryptjs";
import crypto from "node:crypto";
export const hashPassword = async (password) => bcrypt.hash(password, 10);
export const verifyPassword = async (plain, hashed) => bcrypt.compare(plain, hashed);
export const randomToken = () => crypto.randomBytes(36).toString("base64url");
export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
export const signAccessToken = (request, user) => request.server.jwt.sign({
    sub: user.id,
    role: user.role,
    school_id: user.school_id ?? null
}, {
    expiresIn: "60m"
});
export const authReply = (user, token, refreshToken) => ({
    token,
    refreshToken,
    record: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.school_id ?? null,
        school_id: user.school_id ?? null,
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
export const revokeActiveRefreshTokens = async (userId) => {
    const { AuthToken } = await import("../models/index.js");
    await AuthToken.updateMany({
        user_id: userId,
        token_type: "refresh",
        revoked_at: null,
        expires_at: { $gt: new Date() }
    }, { $set: { revoked_at: new Date() } });
};
export const issueRefreshToken = async (userId, request) => {
    const { AuthToken } = await import("../models/index.js");
    const raw = randomToken();
    await AuthToken.create({
        user_id: userId,
        token_hash: hashToken(raw),
        token_type: "refresh",
        expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        ip_address: request?.ip,
        user_agent: request?.headers?.["user-agent"] ?? ""
    });
    return raw;
};
export const forbidden = (reply, detail = "Insufficient permissions") => reply.status(403).send({ detail });
