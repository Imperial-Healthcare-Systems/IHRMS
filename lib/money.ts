/**
 * Money math + display helpers for IHRMS payroll, reimbursements, and CTC fields.
 *
 * Uses `decimal.js` (not native `number`) for all arithmetic so that
 * 0.1 + 0.2 is exactly 0.30 and accumulated reimbursement / salary
 * component sums don't drift over time.
 *
 * Storage contract:
 *   - All money columns are NUMERIC(15,2) in Postgres.
 *   - From JS, write money as a string with exactly 2 decimals
 *     (use `toCurrencyString`). Postgres accepts the string and stores
 *     it lossless.
 *
 * Compute contract:
 *   - `toDecimal()` is the only entry point for "I have a value from
 *     the DB / user input / JSON; convert it to a precise Decimal".
 *   - Do all intermediate math at FULL precision (no rounding).
 *   - Round ONCE, at the end, when storing or producing the displayed
 *     amount.
 *   - Default rounding mode: ROUND_HALF_UP (INR convention).
 *
 * Mirrors the core of ICRM's lib/money.ts. IHRMS does not include the
 * GST split / state-code helpers — those belong to customer invoicing,
 * not payroll.
 */
import Decimal from 'decimal.js'

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP })

export type MoneyInput = Decimal | number | string | null | undefined

/**
 * Convert any input to a Decimal. Null/undefined/empty/'NaN' → Decimal(0).
 * Strings are preferred over numbers for round-trip safety.
 */
export function toDecimal(input: MoneyInput): Decimal {
  if (input === null || input === undefined || input === '') return new Decimal(0)
  if (input instanceof Decimal) return input
  try {
    const d = new Decimal(input as Decimal.Value)
    if (d.isNaN()) return new Decimal(0)
    return d
  } catch {
    return new Decimal(0)
  }
}

/** Precise sum. Replaces `arr.reduce((s, x) => s + Number(x), 0)` on money. */
export function sumDecimals(values: Iterable<MoneyInput>): Decimal {
  let acc = new Decimal(0)
  for (const v of values) acc = acc.plus(toDecimal(v))
  return acc
}

/** Multiply two values precisely (e.g. monthly × 12). */
export function multiply(a: MoneyInput, b: MoneyInput): Decimal {
  return toDecimal(a).times(toDecimal(b))
}

/** Precise division. Round at the call site if you need a fixed-precision result. */
export function divide(a: MoneyInput, b: MoneyInput): Decimal {
  const d = toDecimal(b)
  if (d.isZero()) return new Decimal(0)
  return toDecimal(a).dividedBy(d)
}

/**
 * Round to exactly 2 decimal places using ROUND_HALF_UP. Use for the
 * final figure that gets stored or displayed.
 */
export function roundCurrency(d: MoneyInput): Decimal {
  return toDecimal(d).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

/**
 * Render a Decimal as a 2-decimal string suitable for inserting into a
 * NUMERIC column (e.g. '3703.68'). Postgres parses this losslessly.
 *
 * Prefer this over passing a JS `number` to .insert(...) — string values
 * survive PostgREST's JSON serialisation without IEEE-754 quirks.
 */
export function toCurrencyString(d: MoneyInput): string {
  return roundCurrency(d).toFixed(2)
}

/**
 * Render a Decimal as a JS number — only for response payloads or when
 * the caller explicitly needs a number. Safe for typical INR amounts
 * (< 2^53 paise ≈ ₹90 trillion). Do NOT use this in the middle of an
 * arithmetic chain.
 */
export function toCurrencyNumber(d: MoneyInput): number {
  return roundCurrency(d).toNumber()
}

/** Compare two money values for equality to the paise. */
export function equalsToPaise(a: MoneyInput, b: MoneyInput): boolean {
  return roundCurrency(a).equals(roundCurrency(b))
}

/** `a > b` at paise precision. */
export function greaterThanToPaise(a: MoneyInput, b: MoneyInput): boolean {
  return roundCurrency(a).greaterThan(roundCurrency(b))
}

/** Format an INR amount: "₹1,234.56". Always 2 decimals. */
export function formatINR(value: MoneyInput, currency: string = 'INR'): string {
  const n = toCurrencyNumber(value)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Format without currency symbol. "1,234.56". */
export function formatINRPlain(value: MoneyInput): string {
  const n = toCurrencyNumber(value)
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

// ─── Amount in words (for payslips, Form 16, etc) ─────────────────────

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigitsToWords(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  return TENS[t] + (o ? ' ' + ONES[o] : '')
}

function threeDigitsToWords(n: number): string {
  if (n === 0) return ''
  const h = Math.floor(n / 100)
  const rest = n % 100
  const parts: string[] = []
  if (h > 0) parts.push(ONES[h] + ' Hundred')
  if (rest > 0) parts.push(twoDigitsToWords(rest))
  return parts.join(' ')
}

function integerToIndianWords(n: number): string {
  if (n === 0) return 'Zero'
  if (n < 0) return 'Negative ' + integerToIndianWords(-n)

  const parts: string[] = []

  const crores = Math.floor(n / 10000000)
  if (crores > 0) {
    parts.push(integerToIndianWords(crores) + ' Crore')
    n %= 10000000
  }

  const lakhs = Math.floor(n / 100000)
  if (lakhs > 0) {
    parts.push(twoDigitsToWords(lakhs) + ' Lakh')
    n %= 100000
  }

  const thousands = Math.floor(n / 1000)
  if (thousands > 0) {
    parts.push(twoDigitsToWords(thousands) + ' Thousand')
    n %= 1000
  }

  if (n > 0) parts.push(threeDigitsToWords(n))

  return parts.join(' ').trim()
}

/**
 * Format a money amount as words for a payslip:
 *   "Indian Rupees Three Thousand Seven Hundred Three and Sixty-Eight Paise Only"
 *
 * For round amounts (zero paise), the "and ... Paise" segment is omitted.
 */
export function amountInWords(value: MoneyInput, currency: string = 'INR'): string {
  const rounded = roundCurrency(value)
  const isNegative = rounded.isNegative()
  const absVal = rounded.abs()

  const rupeesInt = absVal.floor().toNumber()
  const paiseInt = absVal.minus(absVal.floor()).times(100).round().toNumber()

  const currencyName = currency === 'INR' ? 'Indian Rupees' : currency
  const rupeesWords = integerToIndianWords(rupeesInt)

  let out = `${currencyName} ${rupeesWords}`
  if (paiseInt > 0) {
    out += ` and ${twoDigitsToWords(paiseInt)} Paise`
  }
  out += ' Only'

  return isNegative ? 'Negative ' + out : out
}
