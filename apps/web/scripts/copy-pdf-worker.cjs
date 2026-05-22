/**
 * Copy pdf.js worker to public/ for stable URL in dev and Docker/nginx builds.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const destDir = path.join(__dirname, '../public');
const dest = path.join(destDir, 'pdf.worker.min.mjs');

if (!fs.existsSync(src)) {
  console.warn('[copy-pdf-worker] pdfjs-dist worker not found, skip');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('[copy-pdf-worker] copied to public/pdf.worker.min.mjs');
