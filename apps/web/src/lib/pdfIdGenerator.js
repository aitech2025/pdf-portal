
import pb from '@/lib/apiClient';

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

  // Extract 2-letter codes (first 2 letters uppercase)
  const catCode = category.categoryName.substring(0, 2).toUpperCase().padEnd(2, 'X');
  const subCatCode = subCategory.subCategoryName.substring(0, 2).toUpperCase().padEnd(2, 'X');

  // Get current date (YYYY-MM format)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const basePrefix = `${catCode}${subCatCode}${year}${month}`;

  try {
    // Query existing PDFs with the same prefix to find the next sequential number
    const records = await pb.collection('pdfs').getList(1, 1, {
      filter: `pdf_id ~ "${basePrefix}"`,
      sort: '-pdf_id',
      $autoCancel: false
    });

    let sequence = 1;
    if (records.items.length > 0 && records.items[0].pdf_id) {
      const lastId = records.items[0].pdf_id;
      const parts = lastId.split('-');
      if (parts.length > 1) {
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          sequence = lastSeq + 1;
        }
      } else {
        // If the last ID didn't have a hyphen (e.g., it was just the prefix), start at 2
        sequence = 2;
      }
    }

    return `${basePrefix}-${sequence}`;
  } catch (error) {
    console.error('Error generating PDF ID:', error);
    // Fallback to a timestamp-based ID if query fails
    return `${basePrefix}-${Date.now().toString().slice(-4)}`;
  }
};
