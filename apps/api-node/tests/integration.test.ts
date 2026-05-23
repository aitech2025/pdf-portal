import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;
let app: { inject: (payload: unknown) => Promise<any>; ready: () => Promise<void>; close: () => Promise<void> };
let connectMongo: () => Promise<void>;
let closeMongo: () => Promise<void>;
let ensureDefaults: () => Promise<void>;
let models: typeof import("../src/models/index.js");

const login = async (email: string, password: string) => {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password }
  });
  expect(res.statusCode).toBe(200);
  return res.json() as { token: string };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.DB_NAME = "iiconacademy";
  process.env.SECRET_KEY = "test-secret";
  process.env.DEFAULT_ADMIN_EMAIL = "admin@iiconacademy.com";
  process.env.DEFAULT_ADMIN_PASSWORD = "admin123";
  process.env.DEFAULT_ADMIN_NAME = "Platform Admin";

  const db = await import("../src/db/mongo.js");
  connectMongo = db.connectMongo;
  closeMongo = db.closeMongo;
  ensureDefaults = db.ensureDefaults;
  models = await import("../src/models/index.js");
  const appModule = await import("../src/app.js");
  app = appModule.buildApp();
  await connectMongo();
  await ensureDefaults();
  await app.ready();
}, 60000);

afterAll(async () => {
  if (app) await app.close();
  if (closeMongo) await closeMongo();
  if (mongoServer) await mongoServer.stop();
});

describe("auth and core APIs", () => {
  it("logs in with default admin", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "admin@iiconacademy.com", password: "admin123" }
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { token: string; refreshToken: string };
    expect(json.token).toBeTruthy();
    expect(json.refreshToken).toBeTruthy();
  });

  it("creates and lists programs", async () => {
    const auth = await login("admin@iiconacademy.com", "admin123");
    const create = await app.inject({
      method: "POST",
      url: "/api/programs",
      headers: { authorization: `Bearer ${auth.token}` },
      payload: { program_code: "OLY", program_name: "Olympiad", slug: "olympiad" }
    });
    expect(create.statusCode).toBe(200);

    const list = await app.inject({
      method: "GET",
      url: "/api/programs",
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(list.statusCode).toBe(200);
    const body = list.json() as { items: Array<{ programCode?: string; program_code?: string }> };
    const rows = body.items ?? [];
    expect(rows.some((r) => (r.programCode ?? r.program_code) === "OLY")).toBe(true);
  });
});

describe("pdf access control", () => {
  it("allows admin preview/download", async () => {
    const auth = await login("admin@iiconacademy.com", "admin123");
    const category = await models.Category.create({
      category_name: "Mathematics",
      category_type: "Grade 1-5",
      slug: "mathematics",
      category_code: "MTH-001"
    });
    const pdf = await models.Pdf.create({
      file_name: "sample.pdf",
      file_data: Buffer.from("%PDF-1.4 sample"),
      file_path: "",
      category_id: category.id,
      status: "approved",
      is_active: true
    });

    const preview = await app.inject({
      method: "GET",
      url: `/api/pdfs/${pdf.id}/preview`,
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.headers["content-type"]).toContain("application/pdf");

    const download = await app.inject({
      method: "GET",
      url: `/api/pdfs/${pdf.id}/download`,
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(download.statusCode).toBe(200);
    expect(download.headers["content-disposition"]).toContain("attachment");
  });
});
