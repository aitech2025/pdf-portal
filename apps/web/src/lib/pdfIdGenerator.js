
import client from '@/lib/apiClient';

/**
 * Generates a unique PDF ID based on category, subcategory, and date.
 * Format: [CAT_CODE][SUBCAT_CODE][YYYY][MM][-N]
 * 
 * @param {Object} category - The category object containing categoryName
 * @param {Object} subCategory - The subcategory object containing subCategoryName
 * @returns {Promise<string>} The generated PDF ID
 */
export const generatePdfId = async (category, subCategory) => {
  if (!category || !subCategory) {
    throw new Error('Category and SubCategory are required to generate PDF ID');
  }

  // The backend auto-generates the canonical PDF ID via generateMappedPdfCode.
  // This client-side helper is kept for display/preview purposes only.
  // Format: CATEGORY-SUBCATEGORY-NNN (mirrors the backend logic)
  const catCode = (category.categoryName || category.category_name || 'CAT')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'GENERAL';

  const subCatCode = (subCategory.subCategoryName || subCategory.sub_category_name || 'SUB')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'GENERAL';

  const basePrefix = `${catCode}-${subCatCode}`;

  try {
    // Query existing PDFs with the same prefix to find the next sequential number
    const response = await client.fetch('/pdfs', 'GET', null, {
      page: 1,
      per_page: 1,
      q: basePrefix,
    });

    const records = response.items || [];
    let sequence = 1;
    if (records.length > 0) {
      // Find the highest sequence number among matching records
      const matching = records.filter(r => {
        const id = r.pdfId || r.pdf_id || '';
        return id.startsWith(basePrefix);
      });
      for (const r of matching) {
        const id = r.pdfId || r.pdf_id || '';
        const parts = id.split('-');
        const last = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(last) && last >= sequence) {
          sequence = last + 1;
        }
      }
    }

    return `${basePrefix}-${String(sequence).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating PDF ID:', error);
    // Fallback to a timestamp-based ID if query fails
    return `${basePrefix}-${Date.now().toString().slice(-4)}`;
  }
};
