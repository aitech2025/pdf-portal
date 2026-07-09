import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/index.js";
import { hashPassword, verifyPassword } from "../lib/auth.js";
export const connectMongo = async () => {
    await mongoose.connect(env.MONGODB_URI, {
        dbName: env.DB_NAME,
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000
    });
};
export const closeMongo = async () => {
    await mongoose.connection.close();
};
/**
 * Ensure the default platform admin exists and is reachable.
 *
 * - If the account doesn't exist, create it with the configured default password.
 * - If it does exist, always unlock it (clear `login_attempts` + `locked_until`,
 *   ensure `is_active`/`verified`) so a forgotten admin can always log back in
 *   once they have the right credentials.
 * - If `RESET_DEFAULT_ADMIN_PASSWORD=true` is set in the environment, force-reset
 *   the password to `DEFAULT_ADMIN_PASSWORD`. This is a one-time rescue switch —
 *   set it once, restart the API, log in, then turn it off again.
 */
export const ensureDefaults = async () => {
    const email = env.DEFAULT_ADMIN_EMAIL;
    const existing = await User.findOne({ email });
    if (!existing) {
        const password_hash = await hashPassword(env.DEFAULT_ADMIN_PASSWORD);
        await User.create({
            email,
            password_hash,
            name: env.DEFAULT_ADMIN_NAME,
            role: "platform_admin",
            is_active: true,
            verified: true,
            must_change_password: false,
            login_attempts: 0
        });
        // eslint-disable-next-line no-console
        console.log(`[seed] created default platform admin <${email}>`);
        return;
    }
    // Always make the default admin reachable: clear lockout state and ensure
    // active + verified. Never destructive to the password unless explicitly
    // requested.
    let mutated = false;
    if (existing.locked_until || (existing.login_attempts ?? 0) > 0) {
        existing.locked_until = undefined;
        existing.login_attempts = 0;
        mutated = true;
    }
    if (existing.is_active !== true) {
        existing.is_active = true;
        mutated = true;
    }
    if (existing.verified !== true) {
        existing.verified = true;
        mutated = true;
    }
    if (existing.role !== "platform_admin" && existing.role !== "admin") {
        existing.role = "platform_admin";
        mutated = true;
    }
    if (env.RESET_DEFAULT_ADMIN_PASSWORD) {
        const matches = await verifyPassword(env.DEFAULT_ADMIN_PASSWORD, existing.password_hash);
        if (!matches) {
            existing.password_hash = await hashPassword(env.DEFAULT_ADMIN_PASSWORD);
            existing.must_change_password = false;
            mutated = true;
            // eslint-disable-next-line no-console
            console.log(`[seed] reset default admin password for <${email}> (RESET_DEFAULT_ADMIN_PASSWORD=true)`);
        }
    }
    if (mutated) {
        await existing.save();
        // eslint-disable-next-line no-console
        console.log(`[seed] ensured default admin <${email}> is unlocked and active`);
    }
};
