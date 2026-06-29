
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

/**
 * Generic free-text search predicate used by list/table pages.
 * Returns true when `query` is empty, or when ANY of the provided column values
 * contains the query (case-insensitive). Pass every value displayed in the row —
 * strings, numbers, dates, arrays, etc. Null/undefined values are skipped.
 *
 * Usage: rows.filter(r => matchesSearch(query, r.name, r.email, statusLabel(r), r.grades))
 */
export function matchesSearch(query, ...values) {
  if (query == null) return true
  const q = String(query).trim().toLowerCase()
  if (!q) return true
  return values.some((v) => {
    if (v === null || v === undefined) return false
    if (Array.isArray(v)) return v.some((x) => x != null && String(x).toLowerCase().includes(q))
    return String(v).toLowerCase().includes(q)
  })
}
