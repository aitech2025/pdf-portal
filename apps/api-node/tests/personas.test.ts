import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import FormData from "form-data";

let mongoServer: MongoMemoryServer;
let app: {
  inject: (payload: unknown) => Promise<any>;
  ready: () => Promise<void>;
  close: () => Promise<void>;
};
let connectMongo: () => Promise<void>;
let closeMongo: () => Promise<void>;
let ensureDefaults: () => Promise<void>;
let models: typeof import("../src/models/index.js");

const ADMIN_EMAIL = "admin@iiconacademy.com";
const ADMIN_PASSWORD = "admin123";

type AuthReply = {
  token: string;
  refreshToken: string;
  record: {
    id: string;
    email: string;
    role: string;
    schoolId: string | null;
    mustChangePassword: boolean;
  };
};

const login = async (email: string, password: string): Promise<AuthReply> => {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password }
  });
  expect(res.statusCode, `login(${email}) -> ${res.body}`).toBe(200);
  return res.json() as AuthReply;
};

const authHeader = (token: string) => ({ authorization: `Bearer ${token}` });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.DB_NAME = "iiconacademy_personas";
  process.env.SECRET_KEY = "test-secret-personas";
  process.env.DEFAULT_ADMIN_EMAIL = ADMIN_EMAIL;
  process.env.DEFAULT_ADMIN_PASSWORD = ADMIN_PASSWORD;
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

describe("Admin persona", () => {
  let adminToken: string;
  let programId: string;
  let categoryAId: string;
  let categoryBId: string;
  let subCategoryAId: string;
  let schoolId: string;
  let schoolAdminUserId: string;
  let schoolAdminEmail: string;
  let schoolAdminPassword: string;
  let pdfId: string;

  it("logs in with the default platform admin", async () => {
    const auth = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = auth.token;
    expect(auth.record.role).toBe("platform_admin");
    expect(auth.record.schoolId).toBeNull();
  });

  it("creates a program, two categories and a sub-category", async () => {
    const program = await app.inject({
      method: "POST",
      url: "/api/programs",
      headers: authHeader(adminToken),
      payload: {
        program_code: "OLY",
        program_name: "Olympiad",
        slug: "olympiad-personas"
      }
    });
    expect(program.statusCode).toBe(200);
    const progBody = program.json() as { id: string };
    programId = progBody.id;

    const catA = await app.inject({
      method: "POST",
      url: "/api/categories",
      headers: authHeader(adminToken),
      payload: {
        programId,
        categoryName: "Mathematics",
        categoryType: "Grade 6-10",
        slug: "math-personas"
      }
    });
    expect(catA.statusCode).toBe(200);
    categoryAId = (catA.json() as { id: string }).id;

    const catB = await app.inject({
      method: "POST",
      url: "/api/categories",
      headers: authHeader(adminToken),
      payload: {
        programId,
        categoryName: "Science",
        categoryType: "Grade 6-10",
        slug: "science-personas"
      }
    });
    expect(catB.statusCode).toBe(200);
    categoryBId = (catB.json() as { id: string }).id;

    const sub = await app.inject({
      method: "POST",
      url: "/api/subCategories",
      headers: authHeader(adminToken),
      payload: { categoryId: categoryAId, subCategoryName: "Algebra" }
    });
    expect(sub.statusCode).toBe(200);
    subCategoryAId = (sub.json() as { id: string }).id;
  });

  it("creates a school which auto-creates an active school admin user with credentials", async () => {
    schoolAdminEmail = "principal@lincoln.example.com";
    const res = await app.inject({
      method: "POST",
      url: "/api/schools",
      headers: authHeader(adminToken),
      payload: {
        schoolName: "Lincoln High",
        email: schoolAdminEmail,
        pointOfContactName: "Dr. Jane Smith",
        mobileNumber: "+15550100",
        location: "Seattle, WA",
        isActive: true,
        sendEmail: true
      }
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as {
      id: string;
      schoolName: string;
      schoolId: string;
      isActive: boolean;
      generatedPassword: string;
    };
    expect(body.schoolName).toBe("Lincoln High");
    expect(body.schoolId).toMatch(/^SCH-/);
    expect(body.isActive).toBe(true);
    expect(body.generatedPassword).toBeTruthy();
    schoolId = body.id;
    schoolAdminPassword = body.generatedPassword;

    const user = await models.User.findOne({ email: schoolAdminEmail }).lean();
    expect(user).toBeTruthy();
    schoolAdminUserId = user!.id;
    expect(user!.role).toBe("school_admin");
    expect(user!.school_id).toBe(schoolId);
    expect(user!.is_active).toBe(true);
    expect(user!.verified).toBe(true);
    expect(user!.must_change_password).toBe(true);

    // Welcome credential notifications were persisted for both email + whatsapp channels
    const notifs = await models.Notification.find({ recipient_id: user!.id, type: "credential_delivery" }).lean();
    const methods = notifs.map((n) => n.notification_method).sort();
    expect(methods).toEqual(["email", "whatsapp"]);
  });

  it("forces platform roles to never have a school assignment", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: authHeader(adminToken),
      payload: {
        email: "moderator@platform.example.com",
        name: "Mod One",
        role: "moderator",
        password: "Secret1234",
        // intentionally pass a school -- must be ignored
        schoolId
      }
    });
    expect(res.statusCode, res.body).toBe(200);
    const created = res.json() as { id: string; schoolId: string | null; role: string };
    expect(created.role).toBe("moderator");
    expect(created.schoolId).toBeNull();

    // Now flip a non-platform user up to platform_admin and make sure school is cleared
    const patch = await app.inject({
      method: "PATCH",
      url: `/api/users/${created.id}`,
      headers: authHeader(adminToken),
      payload: { role: "platform_admin", schoolId }
    });
    expect(patch.statusCode).toBe(200);
    expect((patch.json() as { schoolId: string | null }).schoolId).toBeNull();
  });

  it("rejects school role users without a school assignment", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: authHeader(adminToken),
      payload: {
        email: "teacher-orphan@example.com",
        name: "Orphan",
        role: "teacher"
      }
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatch(/must be assigned to a school/i);
  });

  it("assigns and removes categories on a school", async () => {
    const add = await app.inject({
      method: "POST",
      url: `/api/schools/${schoolId}/categories`,
      headers: authHeader(adminToken),
      payload: { categoryIds: [categoryAId, categoryBId] }
    });
    expect(add.statusCode).toBe(200);

    const list1 = await app.inject({
      method: "GET",
      url: `/api/schools/${schoolId}/categories`,
      headers: authHeader(adminToken)
    });
    expect(list1.statusCode).toBe(200);
    const items1 = (list1.json() as { items: Array<{ categoryId: string }> }).items;
    const ids1 = items1.map((c) => c.categoryId).sort();
    expect(ids1).toEqual([categoryAId, categoryBId].sort());

    const remove = await app.inject({
      method: "DELETE",
      url: `/api/schools/${schoolId}/categories/${categoryBId}`,
      headers: authHeader(adminToken)
    });
    expect(remove.statusCode).toBe(200);

    const list2 = await app.inject({
      method: "GET",
      url: `/api/schools/${schoolId}/categories`,
      headers: authHeader(adminToken)
    });
    const items2 = (list2.json() as { items: Array<{ categoryId: string }> }).items;
    expect(items2.map((c) => c.categoryId)).toEqual([categoryAId]);
  });

  it("uploads a PDF only with a valid category + sub-category", async () => {
    // Missing categoryId / subCategoryId -> 400
    const missing = new FormData();
    missing.append("fileName", "anything.pdf");
    missing.append("file", Buffer.from("%PDF-1.4 broken"), {
      filename: "anything.pdf",
      contentType: "application/pdf"
    });
    const missingRes = await app.inject({
      method: "POST",
      url: "/api/pdfs",
      headers: { ...authHeader(adminToken), ...missing.getHeaders() },
      payload: missing.getBuffer()
    });
    expect(missingRes.statusCode).toBe(400);
    expect(missingRes.body).toMatch(/categoryId and subCategoryId/);

    // Mismatched sub-category (belongs to categoryA, but we pass categoryB) -> 400
    const mismatched = new FormData();
    mismatched.append("fileName", "mismatch.pdf");
    mismatched.append("categoryId", categoryBId);
    mismatched.append("subCategoryId", subCategoryAId);
    mismatched.append("file", Buffer.from("%PDF-1.4 mismatch"), {
      filename: "mismatch.pdf",
      contentType: "application/pdf"
    });
    const mismatchedRes = await app.inject({
      method: "POST",
      url: "/api/pdfs",
      headers: { ...authHeader(adminToken), ...mismatched.getHeaders() },
      payload: mismatched.getBuffer()
    });
    expect(mismatchedRes.statusCode).toBe(400);

    // Valid upload
    const ok = new FormData();
    ok.append("fileName", "algebra-1.pdf");
    ok.append("categoryId", categoryAId);
    ok.append("subCategoryId", subCategoryAId);
    ok.append("status", "approved");
    ok.append("isActive", "true");
    ok.append("file", Buffer.from("%PDF-1.4 algebra"), {
      filename: "algebra-1.pdf",
      contentType: "application/pdf"
    });
    const okRes = await app.inject({
      method: "POST",
      url: "/api/pdfs",
      headers: { ...authHeader(adminToken), ...ok.getHeaders() },
      payload: ok.getBuffer()
    });
    expect(okRes.statusCode, okRes.body).toBe(200);
    pdfId = (okRes.json() as { id: string }).id;
  });

  it("returns category-enriched PDFs in the list", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/api/pdfs",
      headers: authHeader(adminToken)
    });
    expect(list.statusCode).toBe(200);
    const body = list.json() as {
      items: Array<{
        id: string;
        categoryName?: string | null;
        subCategoryName?: string | null;
        programName?: string | null;
      }>;
      totalItems: number;
    };
    expect(body.totalItems).toBeGreaterThan(0);
    const ours = body.items.find((p) => p.id === pdfId);
    expect(ours, "uploaded PDF should appear in list").toBeTruthy();
    expect(ours!.categoryName).toBe("Mathematics");
    expect(ours!.subCategoryName).toBe("Algebra");
    expect(ours!.programName).toBe("Olympiad");
  });

  it("returns category list with pdfCount", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/api/categories",
      headers: authHeader(adminToken)
    });
    expect(list.statusCode).toBe(200);
    const body = list.json() as { items: Array<{ id: string; pdfCount: number }> };
    const mathRow = body.items.find((c) => c.id === categoryAId);
    expect(mathRow).toBeTruthy();
    expect(mathRow!.pdfCount).toBeGreaterThanOrEqual(1);
  });

  it("resets a school user's password (manual delivery)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/users/${schoolAdminUserId}/reset-password`,
      headers: authHeader(adminToken),
      payload: { sendVia: "manual" }
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as {
      generatedPassword: string;
      sentVia: string;
      userEmail: string;
    };
    expect(body.generatedPassword).toBeTruthy();
    expect(body.sentVia).toBe("manual");
    expect(body.userEmail).toBe(schoolAdminEmail);
    schoolAdminPassword = body.generatedPassword;

    const refreshed = await models.User.findOne({ id: schoolAdminUserId }).lean();
    expect(refreshed!.must_change_password).toBe(true);
  });

  it("broadcasts to all schools via the admin send endpoint", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/notifications/admin/send",
      headers: authHeader(adminToken),
      payload: {
        subject: "Welcome {SchoolName}",
        message: "Hello {SchoolName}, an important update.",
        type: "bulk_announcement",
        channels: ["in_app", "email"],
        targetMode: "all_schools"
      }
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { totalRecipients: number; created: number };
    expect(body.totalRecipients).toBeGreaterThanOrEqual(1);
    expect(body.created).toBeGreaterThanOrEqual(2); // in_app + email per recipient

    const notifs = await models.Notification.find({
      recipient_id: schoolAdminUserId,
      type: "bulk_announcement"
    }).lean();
    expect(notifs.length).toBeGreaterThanOrEqual(1);
    expect(notifs[0].subject).toBe("Welcome Lincoln High");
    expect(notifs[0].message).toBe("Hello Lincoln High, an important update.");
  });

  it("broadcasts only to selected schools", async () => {
    const otherEmail = "head@oak.example.com";
    const otherSchool = await app.inject({
      method: "POST",
      url: "/api/schools",
      headers: authHeader(adminToken),
      payload: {
        schoolName: "Oak Public",
        email: otherEmail,
        pointOfContactName: "Mr. Oak"
      }
    });
    expect(otherSchool.statusCode).toBe(200);
    const otherSchoolId = (otherSchool.json() as { id: string }).id;

    const sendRes = await app.inject({
      method: "POST",
      url: "/api/notifications/admin/send",
      headers: authHeader(adminToken),
      payload: {
        subject: "Targeted update",
        message: "Only for selected",
        targetMode: "selected_schools",
        schoolIds: [schoolId],
        channels: ["in_app"]
      }
    });
    expect(sendRes.statusCode, sendRes.body).toBe(200);
    const body = sendRes.json() as { totalRecipients: number };
    expect(body.totalRecipients).toBe(1);

    const otherAdmin = await models.User.findOne({ email: otherEmail }).lean();
    const otherNotif = await models.Notification.findOne({
      recipient_id: otherAdmin!.id,
      subject: "Targeted update"
    }).lean();
    expect(otherNotif).toBeNull();

    // expose for next describe block
    void otherSchoolId;
  });

  it("exposes the school admin's password so the school persona block can log in", () => {
    expect(schoolAdminEmail).toBeTruthy();
    expect(schoolAdminPassword).toBeTruthy();
    // Save for cross-describe usage via global
    (globalThis as Record<string, unknown>).__schoolPersona = {
      email: schoolAdminEmail,
      password: schoolAdminPassword,
      schoolId,
      schoolAdminUserId,
      categoryAId,
      categoryBId,
      pdfId
    };
  });
});

describe("School persona", () => {
  let ctx: {
    email: string;
    password: string;
    schoolId: string;
    schoolAdminUserId: string;
    categoryAId: string;
    categoryBId: string;
    pdfId: string;
  };
  let token: string;

  it("logs in with the auto-generated password and reports mustChangePassword", async () => {
    ctx = (globalThis as Record<string, unknown>).__schoolPersona as typeof ctx;
    const auth = await login(ctx.email, ctx.password);
    token = auth.token;
    expect(auth.record.role).toBe("school_admin");
    expect(auth.record.schoolId).toBe(ctx.schoolId);
    expect(auth.record.mustChangePassword).toBe(true);
  });

  it("changes password on first login and clears mustChangePassword", async () => {
    const newPassword = "NewSecret1234";
    const change = await app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      headers: authHeader(token),
      payload: { current_password: ctx.password, new_password: newPassword }
    });
    expect(change.statusCode, change.body).toBe(200);

    // Old token is still valid for /auth/me until expiry
    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: authHeader(token)
    });
    expect(me.statusCode).toBe(200);
    expect((me.json() as { mustChangePassword: boolean }).mustChangePassword).toBe(false);

    // Re-login with the new password
    const reAuth = await login(ctx.email, newPassword);
    token = reAuth.token;
    expect(reAuth.record.mustChangePassword).toBe(false);
    ctx.password = newPassword;
  });

  it("can access PDFs in assigned categories", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/api/pdfs",
      headers: authHeader(token)
    });
    expect(list.statusCode).toBe(200);
    const body = list.json() as { items: Array<{ id: string; categoryId: string }> };
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((p) => p.categoryId === ctx.categoryAId)).toBe(true);

    const view = await app.inject({
      method: "GET",
      url: `/api/pdfs/${ctx.pdfId}`,
      headers: authHeader(token)
    });
    expect(view.statusCode).toBe(200);

    const preview = await app.inject({
      method: "GET",
      url: `/api/pdfs/${ctx.pdfId}/preview`,
      headers: authHeader(token)
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.headers["content-type"]).toContain("application/pdf");
  });

  it("is blocked from PDFs in unassigned categories", async () => {
    // Upload another PDF under categoryB as the admin
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const subB = await app.inject({
      method: "POST",
      url: "/api/subCategories",
      headers: authHeader(adminLogin.token),
      payload: { categoryId: ctx.categoryBId, subCategoryName: "Physics" }
    });
    expect(subB.statusCode).toBe(200);
    const subBId = (subB.json() as { id: string }).id;

    const fd = new FormData();
    fd.append("fileName", "physics.pdf");
    fd.append("categoryId", ctx.categoryBId);
    fd.append("subCategoryId", subBId);
    fd.append("status", "approved");
    fd.append("isActive", "true");
    fd.append("file", Buffer.from("%PDF-1.4 physics"), {
      filename: "physics.pdf",
      contentType: "application/pdf"
    });
    const upload = await app.inject({
      method: "POST",
      url: "/api/pdfs",
      headers: { ...authHeader(adminLogin.token), ...fd.getHeaders() },
      payload: fd.getBuffer()
    });
    expect(upload.statusCode, upload.body).toBe(200);
    const restrictedPdfId = (upload.json() as { id: string }).id;

    const view = await app.inject({
      method: "GET",
      url: `/api/pdfs/${restrictedPdfId}`,
      headers: authHeader(token)
    });
    expect(view.statusCode).toBe(403);

    const preview = await app.inject({
      method: "GET",
      url: `/api/pdfs/${restrictedPdfId}/preview`,
      headers: authHeader(token)
    });
    expect(preview.statusCode).toBe(403);

    const list = await app.inject({
      method: "GET",
      url: "/api/pdfs",
      headers: authHeader(token)
    });
    const body = list.json() as { items: Array<{ id: string }> };
    expect(body.items.some((p) => p.id === restrictedPdfId)).toBe(false);
  });

  it("updates profile fields via PATCH /api/auth/me", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/auth/me",
      headers: { ...authHeader(token), "content-type": "application/json" },
      payload: { name: "Updated School Admin", address: "1 Lincoln Way" }
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { name?: string };
    // authReply.record uses lowercase keys, name is preserved
    expect(JSON.stringify(body)).toContain("Updated School Admin");

    const refreshed = await models.User.findOne({ id: ctx.schoolAdminUserId }).lean();
    expect(refreshed!.name).toBe("Updated School Admin");
    expect(refreshed!.address).toBe("1 Lincoln Way");
  });

  it("sees broadcast notifications addressed to this user", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications",
      headers: authHeader(token)
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      items: Array<{ subject: string; type: string; recipientId: string }>;
    };
    const broadcast = body.items.find(
      (n) => n.type === "bulk_announcement" && n.subject === "Welcome Lincoln High"
    );
    expect(broadcast).toBeTruthy();
  });

  it("can mark a notification as read", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/api/notifications",
      headers: authHeader(token)
    });
    const items = (list.json() as { items: Array<{ id: string; read: boolean }> }).items;
    const unread = items.find((n) => !n.read);
    if (!unread) return; // nothing to do

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/notifications/${unread.id}`,
      headers: { ...authHeader(token), "content-type": "application/json" },
      payload: { read: true }
    });
    expect(patch.statusCode).toBe(200);
    expect((patch.json() as { read: boolean }).read).toBe(true);
  });

  it("cannot use platform-only endpoints (e.g. broadcast)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/notifications/admin/send",
      headers: authHeader(token),
      payload: {
        subject: "Nope",
        message: "Should be forbidden",
        targetMode: "all_schools",
        channels: ["in_app"]
      }
    });
    expect(res.statusCode).toBe(403);
  });

  it("downloads a single PDF and records the download", async () => {
    const before = await models.DownloadLog.countDocuments({ school_id: ctx.schoolId, user_id: ctx.schoolAdminUserId });
    const res = await app.inject({
      method: "GET",
      url: `/api/pdfs/${ctx.pdfId}/download`,
      headers: authHeader(token)
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain("attachment");
    const after = await models.DownloadLog.countDocuments({ school_id: ctx.schoolId, user_id: ctx.schoolAdminUserId });
    expect(after).toBe(before + 1);
  });

  it("creates a server-side bulk-download archive for assigned PDFs", async () => {
    // Upload a second PDF in the same (allowed) category so we have multiple ids to bundle
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const fd = new FormData();
    fd.append("fileName", "algebra-2.pdf");
    fd.append("categoryId", ctx.categoryAId);
    // We need the sub-category id created in the admin block; reuse the existing one by looking it up
    const sub = await models.SubCategory.findOne({ category_id: ctx.categoryAId }).lean();
    fd.append("subCategoryId", sub!.id);
    fd.append("status", "approved");
    fd.append("isActive", "true");
    fd.append("file", Buffer.from("%PDF-1.4 algebra-2"), {
      filename: "algebra-2.pdf",
      contentType: "application/pdf"
    });
    const upload = await app.inject({
      method: "POST",
      url: "/api/pdfs",
      headers: { ...authHeader(adminLogin.token), ...fd.getHeaders() },
      payload: fd.getBuffer()
    });
    expect(upload.statusCode, upload.body).toBe(200);
    const secondPdfId = (upload.json() as { id: string }).id;

    const ids = [ctx.pdfId, secondPdfId];
    const before = await models.DownloadLog.countDocuments({
      school_id: ctx.schoolId,
      user_id: ctx.schoolAdminUserId,
      download_type: "bulk"
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/pdfs/bulk-download",
      headers: { ...authHeader(token), "content-type": "application/json" },
      payload: { ids, archiveName: "bundle.zip" }
    });
    expect(res.statusCode, res.body?.toString?.().slice(0, 200)).toBe(200);
    expect(res.headers["content-type"]).toContain("application/zip");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toContain("bundle.zip");
    // ZIP local file header magic
    const raw = res.rawPayload as Buffer;
    expect(raw.slice(0, 2).toString("ascii")).toBe("PK");

    const after = await models.DownloadLog.countDocuments({
      school_id: ctx.schoolId,
      user_id: ctx.schoolAdminUserId,
      download_type: "bulk"
    });
    expect(after).toBe(before + ids.length);
  });

  it("rejects bulk-download requests containing unassigned PDFs", async () => {
    // Re-create a restricted PDF in categoryB just like the earlier test (idempotent setup)
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    let subBId: string;
    const existingSubB = await models.SubCategory.findOne({ category_id: ctx.categoryBId }).lean();
    if (existingSubB) {
      subBId = existingSubB.id;
    } else {
      const subBRes = await app.inject({
        method: "POST",
        url: "/api/subCategories",
        headers: authHeader(adminLogin.token),
        payload: { categoryId: ctx.categoryBId, subCategoryName: "Chemistry" }
      });
      subBId = (subBRes.json() as { id: string }).id;
    }
    const fd = new FormData();
    fd.append("fileName", "chemistry.pdf");
    fd.append("categoryId", ctx.categoryBId);
    fd.append("subCategoryId", subBId);
    fd.append("status", "approved");
    fd.append("isActive", "true");
    fd.append("file", Buffer.from("%PDF-1.4 chemistry"), {
      filename: "chemistry.pdf",
      contentType: "application/pdf"
    });
    const upload = await app.inject({
      method: "POST",
      url: "/api/pdfs",
      headers: { ...authHeader(adminLogin.token), ...fd.getHeaders() },
      payload: fd.getBuffer()
    });
    expect(upload.statusCode).toBe(200);
    const restrictedPdfId = (upload.json() as { id: string }).id;

    const res = await app.inject({
      method: "POST",
      url: "/api/pdfs/bulk-download",
      headers: { ...authHeader(token), "content-type": "application/json" },
      payload: { ids: [ctx.pdfId, restrictedPdfId] }
    });
    expect(res.statusCode).toBe(403);
    const body = res.json() as { detail: string; denied: string[] };
    expect(body.denied).toContain(restrictedPdfId);
  });

  it("returns enriched school analytics for the dashboard", async () => {
    // Trigger a preview so recently_viewed is populated
    await app.inject({
      method: "GET",
      url: `/api/pdfs/${ctx.pdfId}/preview`,
      headers: authHeader(token)
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/analytics/school",
      headers: authHeader(token)
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as {
      assigned_categories: number;
      available_pdfs: number;
      my_downloads: number;
      downloads_last_30d: number;
      new_pdfs_last_7d: number;
      downloads_by_category: Array<{ category_id: string; category_name: string; count: number }>;
      recent_uploads: Array<{ id: string; fileName: string; categoryName: string | null }>;
      recently_viewed: Array<{ id: string; fileName: string; last_viewed: string }>;
      storage_bytes: number;
    };
    expect(body.assigned_categories).toBeGreaterThanOrEqual(1);
    expect(body.available_pdfs).toBeGreaterThanOrEqual(1);
    expect(body.my_downloads).toBeGreaterThanOrEqual(1);
    expect(body.new_pdfs_last_7d).toBeGreaterThanOrEqual(1);
    expect(body.storage_bytes).toBeGreaterThan(0);
    expect(Array.isArray(body.downloads_by_category)).toBe(true);
    expect(Array.isArray(body.recent_uploads)).toBe(true);
    expect(body.recent_uploads.every((p) => p.categoryName === "Mathematics")).toBe(true);
    expect(Array.isArray(body.recently_viewed)).toBe(true);
    expect(body.recently_viewed.length).toBeGreaterThanOrEqual(1);
    expect(body.recently_viewed.some((p) => p.id === ctx.pdfId)).toBe(true);
  });

  it("login record includes the school name for watermarking", async () => {
    const auth = await login(ctx.email, ctx.password);
    expect((auth.record as Record<string, unknown>).schoolName).toBe("Lincoln High");
  });
});

describe("Platform endpoints (FRD additions)", () => {
  let adminToken: string;

  beforeAll(async () => {
    const auth = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = auth.token;
  });

  it("GET /api/health and /api/ready return ok", async () => {
    const health = await app.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
    expect((health.json() as { status: string }).status).toBe("ok");

    const ready = await app.inject({ method: "GET", url: "/api/ready" });
    expect(ready.statusCode).toBe(200);
    expect((ready.json() as { status: string }).status).toBe("ready");
  });

  it("GET /api/dashboard returns storage aggregation", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/dashboard",
      headers: authHeader(adminToken)
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { storage_bytes: number; storage_by_school: Array<{ school_id: string; bytes: number; files: number }> };
    expect(typeof body.storage_bytes).toBe("number");
    expect(body.storage_bytes).toBeGreaterThan(0);
    expect(Array.isArray(body.storage_by_school)).toBe(true);
    expect(body.storage_by_school.length).toBeGreaterThanOrEqual(1);
    expect(body.storage_by_school[0].bytes).toBeGreaterThan(0);
  });

  it("GET /api/auditLogs/export returns a CSV file", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auditLogs/export",
      headers: authHeader(adminToken)
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment");
    const body = res.body as string;
    const lines = body.split("\n");
    expect(lines[0]).toBe("timestamp,user_id,action,action_details,resource_type,resource_id,ip_address,user_agent");
    expect(lines.length).toBeGreaterThan(1);
  });

  it("POST /api/pdfs/bulk-reassign updates multiple PDFs", async () => {
    // Find two PDFs in the same category so we can move them
    const persona = (globalThis as Record<string, unknown>).__schoolPersona as {
      categoryAId: string;
      categoryBId: string;
    };

    // List approved PDFs in category A
    const list = await app.inject({
      method: "GET",
      url: `/api/pdfs?categoryId=${persona.categoryAId}&per_page=10`,
      headers: authHeader(adminToken)
    });
    const ids = (list.json() as { items: Array<{ id: string }> }).items.map((p) => p.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    const toMove = ids.slice(0, 2);

    // Need a sub-category under categoryB for re-categorization
    let subBId: string;
    const existingSubB = await models.SubCategory.findOne({ category_id: persona.categoryBId }).lean();
    if (existingSubB) subBId = existingSubB.id;
    else {
      const subB = await app.inject({
        method: "POST",
        url: "/api/subCategories",
        headers: authHeader(adminToken),
        payload: { categoryId: persona.categoryBId, subCategoryName: "Biology" }
      });
      subBId = (subB.json() as { id: string }).id;
    }

    const res = await app.inject({
      method: "POST",
      url: "/api/pdfs/bulk-reassign",
      headers: { ...authHeader(adminToken), "content-type": "application/json" },
      payload: { ids: toMove, categoryId: persona.categoryBId, subCategoryId: subBId }
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { matched: number; modified: number };
    expect(body.matched).toBe(toMove.length);
    expect(body.modified).toBe(toMove.length);

    const after = await models.Pdf.find({ id: { $in: toMove } }).lean();
    expect(after.every((p) => p.category_id === persona.categoryBId)).toBe(true);
  });

  it("POST /api/pdfs/bulk-reassign rejects mismatched category/sub-category", async () => {
    const persona = (globalThis as Record<string, unknown>).__schoolPersona as {
      categoryAId: string;
      categoryBId: string;
    };
    const subA = await models.SubCategory.findOne({ category_id: persona.categoryAId }).lean();
    const res = await app.inject({
      method: "POST",
      url: "/api/pdfs/bulk-reassign",
      headers: { ...authHeader(adminToken), "content-type": "application/json" },
      payload: { ids: ["anything"], categoryId: persona.categoryBId, subCategoryId: subA!.id }
    });
    expect(res.statusCode).toBe(400);
  });
});
