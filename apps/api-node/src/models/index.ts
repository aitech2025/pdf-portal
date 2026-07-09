import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { genId } from "../lib/id.js";
import { PLATFORM_ROLES } from "../lib/permissions.js";

const commonOptions = { timestamps: { createdAt: "created", updatedAt: "updated" }, versionKey: false } as const;

const UserSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password_hash: { type: String, required: true },
    name: { type: String, required: true, index: true },
    role: { type: String, default: "school_viewer", index: true },
    mobile_number: { type: String, index: true, sparse: true },
    address: String,
    school_id: { type: String, default: null, index: true },
    is_active: { type: Boolean, default: true, index: true },
    verified: { type: Boolean, default: false },
    last_login: Date,
    login_count: { type: Number, default: 0 },
    login_attempts: { type: Number, default: 0 },
    locked_until: Date,
    must_change_password: { type: Boolean, default: false },
    last_device: String,
    avatar: String,
    notification_preferences: Schema.Types.Mixed
  },
  commonOptions
);

const platformRoleSet = new Set<string>(PLATFORM_ROLES);

UserSchema.pre("save", function coercePlatformRoleSchool(next) {
  if (platformRoleSet.has(this.role)) {
    this.school_id = null;
  }
  next();
});

UserSchema.pre("findOneAndUpdate", function coercePlatformRoleUpdate(next) {
  const update = (this.getUpdate() ?? {}) as Record<string, unknown> & {
    $set?: Record<string, unknown>;
  };
  const role = (update.$set?.role ?? update.role) as string | undefined;

  if (role && platformRoleSet.has(role)) {
    update.school_id = null;
    update.$set = { ...(update.$set ?? {}), school_id: null };
    this.setUpdate(update);
  }

  next();
});

UserSchema.pre("insertMany", function coercePlatformRoleInsert(next, docs: Array<Record<string, unknown>>) {
  for (const doc of docs) {
    if (platformRoleSet.has(String(doc.role ?? ""))) {
      doc.school_id = null;
    }
  }
  next();
});

const SchoolSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    school_name: { type: String, required: true, index: true },
    school_id: { type: String, unique: true, sparse: true, index: true },
    organization_type: { type: String, default: "school" },
    institution_type: { type: String, default: "school", index: true }, // 'school' | 'college'
    whatsapp_number: String,
    location: String,
    address: String,
    email: String,
    mobile_number: String,
    point_of_contact_name: String,
    point_of_contact_mobile: String,
    principal_name: String,
    grades: String,
    is_active: { type: Boolean, default: true, index: true },
    deactivation_message: String
  },
  commonOptions
);

const ProgramSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    program_code: { type: String, required: true, unique: true },
    program_name: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    icon: String,
    status: { type: String, default: "active", index: true },
    display_order: { type: Number, default: 0 },
    is_archived: { type: Boolean, default: false }
  },
  commonOptions
);

const CategorySchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    program_id: { type: String, default: null, index: true },
    category_code: { type: String, unique: true, sparse: true, index: true },
    category_name: { type: String, required: true, index: true },
    slug: { type: String, unique: true, sparse: true },
    category_type: { type: String, required: true, index: true },
    program_type: { type: String, enum: ["pdf", "video"], default: "pdf" },
    description: String,
    status: { type: String, default: "active" },
    is_archived: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true, index: true },
    icon: String,
    display_order: { type: Number, default: 0 }
  },
  commonOptions
);
CategorySchema.index({ program_id: 1, slug: 1 }, { unique: true, sparse: true });

const SubCategorySchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    sub_category_name: { type: String, required: true, index: true },
    category_id: { type: String, required: true, index: true },
    sub_category_code: { type: String, sparse: true, index: true },
    description: String,
    is_active: { type: Boolean, default: true, index: true },
    icon: String,
    display_order: { type: Number, default: 0 }
  },
  commonOptions
);
SubCategorySchema.index({ category_id: 1, sub_category_code: 1 }, { unique: true, sparse: true });

const PdfSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    file_name: { type: String, required: true },
    file_path: { type: String, default: "" },
    file_data: Buffer,
    file_size: Number,
    category_id: { type: String, default: null, index: true },
    sub_category_id: { type: String, default: null, index: true },
    class_id: { type: String, default: null, index: true },
    subject_id: { type: String, default: null, index: true },
    uploaded_by: { type: String, default: null, index: true },
    is_active: { type: Boolean, default: false, index: true },
    status: { type: String, default: "pending", index: true },
    rejection_reason: String,
    description: String,
    tags: String,
    email: String,
    pdf_id: { type: String, index: true },
    original_file_name: String,
    file_checksum: String,
    thumbnail: String,
    deleted_at: { type: Date, default: null, index: true },
    current_version: { type: Number, default: 1 },
    version_count: { type: Number, default: 1 },
    version_notes: String,
    download_count: { type: Number, default: 0 },
    view_count: { type: Number, default: 0 }
  },
  commonOptions
);

// Compound index covering the school access control filter (category + class + subject + status + active + deleted)
PdfSchema.index({ category_id: 1, class_id: 1, subject_id: 1, status: 1, is_active: 1, deleted_at: 1 });
// Text index for full-text search across file_name, description, and tags
PdfSchema.index({ file_name: "text", description: "text", tags: "text" });

const PdfVersionSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    pdf_id: { type: String, required: true, index: true },
    version_number: { type: Number, required: true },
    file_path: { type: String, default: "" },
    file_data: Buffer,
    file_size: Number,
    uploaded_by: { type: String, required: true },
    version_notes: String,
    is_current: { type: Boolean, default: false, index: true },
    upload_date: { type: Date, default: Date.now }
  },
  commonOptions
);

const SchoolCategoryAccessSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    school_id: { type: String, required: true, index: true },
    category_id: { type: String, required: true, index: true }
  },
  commonOptions
);
SchoolCategoryAccessSchema.index({ school_id: 1, category_id: 1 }, { unique: true });

const NotificationSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    recipient_id: { type: String, required: true, index: true },
    type: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    notification_method: { type: String, default: "email" },
    status: { type: String, default: "pending", index: true },
    error_message: String,
    read: { type: Boolean, default: false, index: true }
  },
  commonOptions
);
// Compound for paginated inbox: filter by recipient, sorted by creation date
NotificationSchema.index({ recipient_id: 1, created: -1 });

const AuthTokenSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    token_hash: { type: String, required: true, unique: true, index: true },
    token_type: { type: String, required: true, index: true },
    expires_at: { type: Date, required: true, index: true },
    used_at: Date,
    revoked_at: Date,
    ip_address: String,
    user_agent: String
  },
  commonOptions
);

const MaintenanceModeSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    is_enabled: { type: Boolean, default: false },
    message: String,
    end_time: Date
  },
  commonOptions
);

const SystemSettingsSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    app_name: { type: String, default: "i-icon academy" },
    app_description: String,
    support_email: String,
    support_phone: String,
    support_website: String,
    timezone: String,
    language: String,
    date_format: String,
    time_format: String,
    maintenance_mode: { type: Boolean, default: false },
    maintenance_message: String,
    email_provider: { type: String, default: "smtp" },
    // Primary (Resend) SMTP
    smtp_host: String,
    smtp_port: Number,
    smtp_username: String,
    smtp_password: String,
    email_from_address: String,
    email_from_name: String,
    enable_tls: { type: Boolean, default: true },
    enable_ssl: { type: Boolean, default: false },
    // Secondary (Brevo) SMTP
    smtp2_host: String,
    smtp2_port: Number,
    smtp2_username: String,
    smtp2_password: String,
    email2_from_address: String,
    email2_from_name: String,
    enable_ssl2: { type: Boolean, default: false },
    // Which provider is active: 'primary' | 'brevo'
    active_email_provider: { type: String, default: "primary" },
    integrations: Schema.Types.Mixed,
    feature_flags: Schema.Types.Mixed,
    security_settings: Schema.Types.Mixed,
    // WhatsApp Cloud API
    whatsapp_enabled: { type: Boolean, default: false },
    whatsapp_phone_number_id: String,
    whatsapp_access_token: String,
    whatsapp_api_version: { type: String, default: "v20.0" }
  },
  commonOptions
);

const UserPreferencesSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    user_id: { type: String, required: true, unique: true, index: true },
    theme: { type: String, default: "system" },
    language: { type: String, default: "en" },
    timezone: String,
    email_notifications: { type: Boolean, default: true },
    in_app_notifications: { type: Boolean, default: true }
  },
  commonOptions
);

const DownloadLogSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    school_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    pdf_id: { type: String, required: true, index: true },
    category_id: String,
    sub_category_id: String,
    download_type: { type: String, default: "single" },
    downloaded_at: { type: Date, default: Date.now, index: true }
  },
  commonOptions
);
// Supports the school dashboard's per-school date-bounded download counts/aggregations.
DownloadLogSchema.index({ school_id: 1, downloaded_at: -1 });
DownloadLogSchema.index({ school_id: 1, category_id: 1 });

const ViewLogSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    school_id: { type: String, default: null, index: true },
    user_id: { type: String, required: true, index: true },
    pdf_id: { type: String, required: true, index: true },
    category_id: { type: String, default: null, index: true },
    sub_category_id: { type: String, default: null },
    viewed_at: { type: Date, default: Date.now, index: true }
  },
  commonOptions
);
ViewLogSchema.index({ user_id: 1, viewed_at: -1 });
ViewLogSchema.index({ school_id: 1, viewed_at: -1 });

const AuditLogSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    action_details: String,
    ip_address: String,
    user_agent: String,
    resource_type: String,
    resource_id: String,
    timestamp: { type: Date, default: Date.now, index: true }
  },
  commonOptions
);
// Compound for audit log queries: timestamp-first (sort) + optional user_id/action filters
AuditLogSchema.index({ timestamp: -1, user_id: 1, action: 1 });

const AnalyticsEventSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    user_id: { type: String, default: null, index: true },
    event_type: { type: String, required: true, index: true },
    event_data: Schema.Types.Mixed,
    session_id: String,
    timestamp: { type: Date, default: Date.now, index: true }
  },
  commonOptions
);

const FavoriteSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    pdf_id: { type: String, required: true, index: true }
  },
  commonOptions
);
FavoriteSchema.index({ user_id: 1, pdf_id: 1 }, { unique: true });

const OnboardingRequestSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    school_name: { type: String, required: true },
    institution_type: { type: String, default: "school" }, // 'school' | 'college'
    address: String,
    location: String,
    email: { type: String, required: true },
    mobile_number: String,
    point_of_contact_name: String,
    point_of_contact_mobile: String,
    grades: String,
    category: String,
    status: { type: String, default: "pending" },
    rejection_reason: String,
    submitted_at: { type: Date, default: Date.now },
    approved_at: Date
  },
  commonOptions
);

const SubjectSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    subject_name: { type: String, required: true, index: true },
    class_id: { type: String, required: true, index: true }, // references SubCategory.id
    subject_code: { type: String, sparse: true, index: true },
    description: String,
    is_active: { type: Boolean, default: true, index: true },
    display_order: { type: Number, default: 0 }
  },
  commonOptions
);
SubjectSchema.index({ class_id: 1, subject_name: 1 }, { unique: true, sparse: true });
SubjectSchema.index({ class_id: 1, subject_code: 1 }, { unique: true, sparse: true });

const ClassMasterSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    class_name: { type: String, required: true, unique: true, index: true },
    class_code: { type: String, unique: true, sparse: true, index: true },
    description: String,
    is_active: { type: Boolean, default: true, index: true },
    display_order: { type: Number, default: 0 }
  },
  commonOptions
);

const SubjectMasterSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    subject_name: { type: String, required: true, unique: true, index: true },
    subject_code: { type: String, unique: true, sparse: true, index: true },
    description: String,
    is_active: { type: Boolean, default: true, index: true },
    display_order: { type: Number, default: 0 }
  },
  commonOptions
);

const ProgramClassMapSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    program_id: { type: String, required: true, index: true },
    class_id: { type: String, required: true, index: true }
  },
  commonOptions
);
ProgramClassMapSchema.index({ program_id: 1, class_id: 1 }, { unique: true });

const ProgramClassSubjectMapSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    program_id: { type: String, required: true, index: true },
    class_id: { type: String, required: true, index: true },
    subject_id: { type: String, required: true, index: true }
  },
  commonOptions
);
ProgramClassSubjectMapSchema.index({ program_id: 1, class_id: 1, subject_id: 1 }, { unique: true });

const SchoolClassAccessSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    school_id: { type: String, required: true, index: true },
    program_id: { type: String, required: true, index: true }, // = category_id
    class_id: { type: String, required: true, index: true }   // = subcategory_id
  },
  commonOptions
);
SchoolClassAccessSchema.index({ school_id: 1, program_id: 1, class_id: 1 }, { unique: true });

const SchoolSubjectAccessSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    school_id: { type: String, required: true, index: true },
    program_id: { type: String, required: true, index: true },
    class_id: { type: String, required: true, index: true },
    subject_id: { type: String, required: true, index: true }
  },
  commonOptions
);
SchoolSubjectAccessSchema.index({ school_id: 1, program_id: 1, class_id: 1, subject_id: 1 }, { unique: true });

const VideoLessonSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    title: { type: String, required: true, index: true },
    description: String,
    vimeo_url: { type: String, required: true },
    vimeo_id: String,
    program_id: { type: String, default: null, index: true }, // optional — set when assigned to a program
    class_id: { type: String, required: true, index: true },
    subject_id: { type: String, default: null, index: true },
    thumbnail: String,
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: String, required: true, index: true },
    download_count: { type: Number, default: 0 },
    view_count: { type: Number, default: 0 }
  },
  commonOptions
);

const UserRequestSchema = new Schema(
  {
    id: { type: String, default: genId, unique: true, index: true },
    school_id: { type: String, required: true, index: true },
    requested_user_name: { type: String, required: true },
    requested_user_email: { type: String, required: true },
    requested_user_mobile: String,
    status: { type: String, default: "pending" },
    rejection_reason: String,
    submitted_at: { type: Date, default: Date.now },
    approved_at: Date
  },
  commonOptions
);

export const User = mongoose.model("User", UserSchema);
export const School = mongoose.model("School", SchoolSchema);
export const Program = mongoose.model("Program", ProgramSchema);
export const Category = mongoose.model("Category", CategorySchema);
export const SubCategory = mongoose.model("SubCategory", SubCategorySchema);
export const Subject = mongoose.model("Subject", SubjectSchema);
export const ClassMaster = mongoose.model("ClassMaster", ClassMasterSchema);
export const SubjectMaster = mongoose.model("SubjectMaster", SubjectMasterSchema);
export const ProgramClassMap = mongoose.model("ProgramClassMap", ProgramClassMapSchema);
export const ProgramClassSubjectMap = mongoose.model("ProgramClassSubjectMap", ProgramClassSubjectMapSchema);
export const SchoolClassAccess = mongoose.model("SchoolClassAccess", SchoolClassAccessSchema);
export const SchoolSubjectAccess = mongoose.model("SchoolSubjectAccess", SchoolSubjectAccessSchema);
export const VideoLesson = mongoose.model("VideoLesson", VideoLessonSchema);
export const Pdf = mongoose.model("Pdf", PdfSchema);
export const PdfVersion = mongoose.model("PdfVersion", PdfVersionSchema);
export const SchoolCategoryAccess = mongoose.model("SchoolCategoryAccess", SchoolCategoryAccessSchema);
export const Notification = mongoose.model("Notification", NotificationSchema);
export const AuthToken = mongoose.model("AuthToken", AuthTokenSchema);
export const MaintenanceMode = mongoose.model("MaintenanceMode", MaintenanceModeSchema);
export const SystemSettings = mongoose.model("SystemSettings", SystemSettingsSchema);
export const UserPreferences = mongoose.model("UserPreferences", UserPreferencesSchema);
export const DownloadLog = mongoose.model("DownloadLog", DownloadLogSchema);
export const ViewLog = mongoose.model("ViewLog", ViewLogSchema);
export const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
export const AnalyticsEvent = mongoose.model("AnalyticsEvent", AnalyticsEventSchema);
export const Favorite = mongoose.model("Favorite", FavoriteSchema);
export const OnboardingRequest = mongoose.model("OnboardingRequest", OnboardingRequestSchema);
export const UserRequest = mongoose.model("UserRequest", UserRequestSchema);

export type UserDoc = InferSchemaType<typeof UserSchema>;
