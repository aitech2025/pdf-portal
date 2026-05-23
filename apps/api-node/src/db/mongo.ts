import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/index.js";
import { hashPassword } from "../lib/auth.js";

export const connectMongo = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.DB_NAME });
};

export const closeMongo = async (): Promise<void> => {
  await mongoose.connection.close();
};

export const ensureDefaults = async (): Promise<void> => {
  const exists = await User.findOne({ email: env.DEFAULT_ADMIN_EMAIL }).lean();
  if (exists) return;

  const password_hash = await hashPassword(env.DEFAULT_ADMIN_PASSWORD);
  await User.create({
    email: env.DEFAULT_ADMIN_EMAIL,
    password_hash,
    name: env.DEFAULT_ADMIN_NAME,
    role: "platform_admin",
    is_active: true,
    verified: true
  });
};
