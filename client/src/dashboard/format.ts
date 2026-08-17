// Display formatting for numbers and times.
//
// Intl throughout rather than toFixed and string maths: it produces the
// thousands separators and the minus sign the reader's conventions expect,
// and it is already in the browser.

// Money and percentages are pinned to en-US so the currency renders as
// "$63,409.12" everywhere rather than "US$" or a swapped separator. Times use
// the reader's own locale — that one is about their clock, not our data.
const USD_LOCALE = "en-US";

// One formatter per precision, built once. Ten rows would not care; the
// sections that come next render more.
const usdFormatters = new Map<number, Intl.NumberFormat>();

function usdFormatter(digits: number): Intl.NumberFormat {
  let formatter = usdFormatters.get(digits);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(USD_LOCALE, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    usdFormatters.set(digits, formatter);
  }
  return formatter;
}

/**
 * A USD price, with precision that follows magnitude.
 *
 * Two decimals suit Bitcoin at $63,409.12 and destroy Dogecoin, which would
 * round to $0.07 and lose the digits that actually move. A fixed precision
 * cannot serve both ends of a catalog that spans six orders of magnitude.
 */
export function formatUsd(value: number): string {
  const magnitude = Math.abs(value);
  const digits = magnitude >= 1 ? 2 : magnitude >= 0.01 ? 4 : 6;
  return usdFormatter(digits).format(value);
}

// exceptZero, not always: a gain reads "+1.4%", a loss "-1.4%", and an
// unchanged price reads "0.0%" rather than claiming a signed nothing.
const changeFormatter = new Intl.NumberFormat(USD_LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

/** A 24h change, already a percentage number from the provider (-1.409). */
export function formatChange(value: number): string {
  return `${changeFormatter.format(value)}%`;
}

// Hours and minutes only. The stale footer answers "how old is this", and a
// date on it would be noise every day but one.
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

// Month and day, no year: these are recent headlines, and the year would be
// the same on every line.
//
// timeZone UTC is not optional here. A date-only string parses as UTC
// midnight, so formatting it in a zone behind UTC would land on the previous
// evening and print the day before the one the article carries.
//
// Pinned to en-US, unlike formatTime. The clock belongs to the reader; a
// publication date belongs to the article, and this keeps it "Aug 14"
// everywhere rather than reordering itself per locale.
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** An ISO date-only string ("2026-08-14") as "Aug 14". */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
