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
// Derives the @iiconacademy.in login email from the school name.
// Uses the first alphanumeric word, lowercased. Conflict resolution appends a counter.
export const buildSchoolLoginEmail = (schoolName) => {
    const firstWord = schoolName.trim().split(/\s+/)[0] ?? schoolName.trim();
    const cleaned = firstWord.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    return `${cleaned || "school"}@iiconacademy.in`;
};
// Derives the deterministic password: first 4 alphanumeric chars of school name + last 4 digits of mobile.
export const buildSchoolPassword = (schoolName, mobileNumber) => {
    const nameCleaned = schoolName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const namePart = nameCleaned.slice(0, 4).padEnd(4, "x");
    const digits = mobileNumber.replace(/\D/g, "");
    const mobilePart = digits.slice(-4).padStart(4, "0");
    return `${namePart}${mobilePart}`;
};
export const createSchoolAdminUser = async (input) => {
    // Resolve unique @iiconacademy.in login email — naveen, naveen2, naveen3, …
    let loginEmail = buildSchoolLoginEmail(input.school_name);
    const baseLocal = loginEmail.split("@")[0];
    let suffix = 2;
    while (await User.findOne({ email: loginEmail }).lean()) {
        loginEmail = `${baseLocal}${suffix}@iiconacademy.in`;
        suffix++;
    }
    const password = input.password ??
        (input.mobile_number
            ? buildSchoolPassword(input.school_name, input.mobile_number)
            : genPassword());
    const user = await User.create({
        email: loginEmail,
        password_hash: await hashPassword(password),
        name: input.name,
        role: "school_admin",
        school_id: input.schoolId,
        mobile_number: input.mobile_number,
        is_active: true,
        verified: true,
        must_change_password: false
    });
    return { user, generatedPassword: password, generatedEmail: loginEmail };
};
