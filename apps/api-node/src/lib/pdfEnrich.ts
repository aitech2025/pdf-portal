import { Category, ClassMaster, SubjectMaster, Pdf, Program, SubCategory } from "../models/index.js";
import { generateMappedPdfCode } from "./codes.js";
import { serializeDoc } from "./serialize.js";

type PdfLean = Record<string, unknown> & {
  id?: string;
  pdf_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  class_id?: string | null;
  subject_id?: string | null;
};

/**
 * Backfill a stable `pdf_id` (human-readable code) for any PDF that is missing
 * one. The standard upload path in routes/pdfs.ts already assigns one, so this
 * only fires for legacy / hand-inserted records — but having it here means
 * every read path heals broken docs the first time they're requested.
 */
const backfillMissingCode = async (
  pdf: PdfLean,
  cat: { category_name?: string | null } | null | undefined,
  sub: { sub_category_name?: string | null } | null | undefined
): Promise<string | null> => {
  const existing = pdf.pdf_id;
  if (existing && String(existing).trim()) return String(existing);
  if (!pdf.id) return null;

  const catName = cat?.category_name ?? "UNCATEGORIZED";
  const subName = sub?.sub_category_name ?? "GENERAL";
  try {
    const code = await generateMappedPdfCode(catName, subName);
    await Pdf.updateOne({ id: pdf.id }, { $set: { pdf_id: code } });
    return code;
  } catch {
    return null;
  }
};

export const enrichPdfs = async (pdfs: PdfLean[]): Promise<Record<string, unknown>[]> => {
  if (!pdfs.length) return [];

  const categoryIds = [...new Set(pdfs.map((p) => p.category_id).filter(Boolean))] as string[];
  const subCategoryIds = [...new Set(pdfs.map((p) => p.sub_category_id).filter(Boolean))] as string[];
  const classIds = [...new Set(pdfs.map((p) => p.class_id).filter(Boolean))] as string[];
  const subjectIds = [...new Set(pdfs.map((p) => p.subject_id).filter(Boolean))] as string[];

  const [categories, subCategories, masterClasses, masterSubjects] = await Promise.all([
    Category.find({ id: { $in: categoryIds } }).lean(),
    SubCategory.find({ id: { $in: subCategoryIds } }).lean(),
    classIds.length ? ClassMaster.find({ id: { $in: classIds } }).lean() : Promise.resolve([]),
    subjectIds.length ? SubjectMaster.find({ id: { $in: subjectIds } }).lean() : Promise.resolve([])
  ]);

  const programIds = [...new Set(categories.map((c) => c.program_id).filter(Boolean))] as string[];
  const programs = programIds.length ? await Program.find({ id: { $in: programIds } }).lean() : [];

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const subMap = new Map(subCategories.map((s) => [s.id, s]));
  const progMap = new Map(programs.map((p) => [p.id, p]));
  const clsMap = new Map(masterClasses.map((c) => [c.id, c]));
  const subjMap = new Map(masterSubjects.map((s) => [s.id, s]));

  return Promise.all(
    pdfs.map(async (pdf) => {
      const cat = pdf.category_id ? catMap.get(pdf.category_id) : null;
      const sub = pdf.sub_category_id ? subMap.get(pdf.sub_category_id) : null;
      const prog = cat?.program_id ? progMap.get(cat.program_id) : null;
      const cls = pdf.class_id ? clsMap.get(pdf.class_id) : null;
      const subj = pdf.subject_id ? subjMap.get(pdf.subject_id) : null;

      const code = await backfillMissingCode(pdf, cat, sub);
      const base = serializeDoc({ ...pdf, pdf_id: code ?? pdf.pdf_id ?? null } as Record<string, unknown>);

      return {
        ...base,
        categoryId: pdf.category_id ?? null,
        subCategoryId: pdf.sub_category_id ?? null,
        classId: pdf.class_id ?? null,
        subjectId: pdf.subject_id ?? null,
        categoryName: cat?.category_name ?? null,
        categoryCode: cat?.category_code ?? null,
        categoryType: cat?.category_type ?? null,
        subCategoryName: sub?.sub_category_name ?? null,
        className: (cls as any)?.class_name ?? null,
        classCode: (cls as any)?.class_code ?? null,
        subjectName: (subj as any)?.subject_name ?? null,
        subjectCode: (subj as any)?.subject_code ?? null,
        programId: cat?.program_id ?? null,
        programName: prog?.program_name ?? null,
        programCode: prog?.program_code ?? null,
        expand: {
          categoryId: cat
            ? {
                id: cat.id,
                categoryName: cat.category_name,
                categoryCode: cat.category_code,
                categoryType: cat.category_type
              }
            : null,
          subCategoryId: sub
            ? {
                id: sub.id,
                subCategoryName: sub.sub_category_name
              }
            : null,
          programId: prog
            ? {
                id: prog.id,
                programName: prog.program_name,
                programCode: prog.program_code
              }
            : null
        }
      };
    })
  );
};
