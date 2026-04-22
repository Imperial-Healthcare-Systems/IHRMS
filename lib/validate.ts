const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export interface FileValidationResult {
  valid: boolean
  error?: string
}

export function validateFile(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit` }
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `File type "${file.type}" is not allowed` }
  }
  return { valid: true }
}

export function validateRequired<T extends Record<string, unknown>>(
  body: T,
  fields: (keyof T)[]
): string | null {
  for (const field of fields) {
    const val = body[field]
    if (val === undefined || val === null || val === '') {
      return `${String(field)} is required`
    }
  }
  return null
}
