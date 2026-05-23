import { Category, Pdf } from "../models/index.js";

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** PROGRAM-CATEGORY-XXX e.g. OLY-OBJ-001 */
export const generateCategoryCode = async (
  programCode: string,
  categoryName: string
): Promise<string> => {
  const segment = categoryName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4) || "GEN";
  const prefix = `${programCode}-${segment}`;
  const existing = await Category.find({
    category_code: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-` }
  })
    .select("category_code")
    .lean();
  let maxSeq = 0;
  for (const row of existing) {
    const parts = (row.category_code ?? "").split("-");
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) maxSeq = Math.max(maxSeq, parseInt(last, 10));
  }
  return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
};

/** PDF code within category: uses category_code base + sequence */
export const generatePdfCode = async (categoryCode: string): Promise<string> => {
  const prefix = categoryCode;
  const existing = await Pdf.find({
    pdf_id: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` },
    deleted_at: null
  })
    .select("pdf_id")
    .lean();
  let maxSeq = 0;
  for (const row of existing) {
    const code = row.pdf_id ?? "";
    const parts = code.split("-");
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) maxSeq = Math.max(maxSeq, parseInt(last, 10));
  }
  return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
};
