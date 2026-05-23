import crypto from "node:crypto";
import { School, User } from "../models/index.js";
import { hashPassword } from "./auth.js";
export const genSchoolId = async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 20; i++) {
        let suffix = "";
        for (let j = 0; j < 6; j++) {
            suffix += chars[crypto.randomInt(chars.length)];
        }
        const code = `SCH-${suffix}`;
        const exists = await School.findOne({ school_id: code }).lean();
        if (!exists)
            return code;
    }
    return `SCH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
};
export const genPassword = (length = 10) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
    let out = "";
    for (let i = 0; i < length; i++) {
        out += chars[crypto.randomInt(chars.length)];
    }
    return out;
};
export const createSchoolAdminUser = async (input) => {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
        throw new Error(`User with email ${input.email} already exists`);
    }
    const password = input.password ?? genPassword();
    const user = await User.create({
        email: input.email.toLowerCase(),
        password_hash: await hashPassword(password),
        name: input.name,
        role: "school_admin",
        school_id: input.schoolId,
        mobile_number: input.mobile_number,
        is_active: true,
        verified: true,
        must_change_password: true
    });
    return { user, generatedPassword: password };
};
