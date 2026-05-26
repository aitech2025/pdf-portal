
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Returns the human-readable PDF code (e.g. "OLYMPIAD-OBJECTIVE-001") regardless
 * of whether the backend response was already camel-cased (`pdfId`) or still
 * snake-cased (`pdf_id`). Returns `null` when neither field is populated so
 * callers can render their own placeholder.
 *
 * Centralised because the serializer in apps/api-node/src/lib/serialize.ts
 * converts `pdf_id` → `pdfId` on the wire — display sites must read both keys
 * or they'll fall through to "ID PENDING" forever.
 */
export function getPdfCode(pdf) {
  if (!pdf || typeof pdf !== 'object') return null
  const code = pdf.pdfId ?? pdf.pdf_id ?? pdf.pdfID ?? null
  return code && String(code).trim() ? String(code) : null
}
