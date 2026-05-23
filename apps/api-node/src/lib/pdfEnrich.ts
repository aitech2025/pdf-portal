import { Category, Program, SubCategory } from "../models/index.js";
import { serializeDoc } from "./serialize.js";

type PdfLean = Record<string, unknown> & {
  category_id?: string | null;
  sub_category_id?: string | null;
};

export const enrichPdfs = async (pdfs: PdfLean[]): Promise<Record<string, unknown>[]> => {
  if (!pdfs.length) return [];

  const categoryIds = [...new Set(pdfs.map((p) => p.category_id).filter(Boolean))] as string[];
  const subCategoryIds = [...new Set(pdfs.map((p) => p.sub_category_id).filter(Boolean))] as string[];

  const [categories, subCategories] = await Promise.all([
    Category.find({ id: { $in: categoryIds } }).lean(),
    SubCategory.find({ id: { $in: subCategoryIds } }).lean()
  ]);

  const programIds = [...new Set(categories.map((c) => c.program_id).filter(Boolean))] as string[];
  const programs = programIds.length ? await Program.find({ id: { $in: programIds } }).lean() : [];

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const subMap = new Map(subCategories.map((s) => [s.id, s]));
  const progMap = new Map(programs.map((p) => [p.id, p]));

  return pdfs.map((pdf) => {
    const base = serializeDoc(pdf as Record<string, unknown>);
    const cat = pdf.category_id ? catMap.get(pdf.category_id) : null;
    const sub = pdf.sub_category_id ? subMap.get(pdf.sub_category_id) : null;
    const prog = cat?.program_id ? progMap.get(cat.program_id) : null;

    return {
      ...base,
      categoryId: pdf.category_id ?? null,
      subCategoryId: pdf.sub_category_id ?? null,
      categoryName: cat?.category_name ?? null,
      categoryCode: cat?.category_code ?? null,
      categoryType: cat?.category_type ?? null,
      subCategoryName: sub?.sub_category_name ?? null,
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
  });
};
