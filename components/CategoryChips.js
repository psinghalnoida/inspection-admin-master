'use client';

/**
 * Surveyor licence categories (v2 §1). Shared by the surveyor list, detail and edit pages.
 *
 * Three separate concepts — do not conflate them:
 *   is_investigator — baseline capability, true for every approved surveyor. NOT a category.
 *   categories      — licensed lines of business granted by an admin. May be empty.
 *   is_prime        — derived server-side: true when at least one unexpired category is granted.
 */

export const SURVEYOR_CATEGORIES = [
    { value: 'motor', label: 'Motor' },
    { value: 'marine', label: 'Marine' },
    { value: 'fire', label: 'Fire' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'miscellaneous', label: 'Miscellaneous' },
    { value: 'lop', label: 'LOP' },
    { value: 'hull', label: 'Hull' },
    { value: 'aviation', label: 'Aviation' },
];

export const categoryLabel = (value) =>
    SURVEYOR_CATEGORIES.find((c) => c.value === value)?.label || value;

// A MySQL DATE comes back either as 'YYYY-MM-DD' or as a timezone-shifted ISO timestamp,
// so normalise through IST — the timezone the rest of this admin renders dates in.
const istDate = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** 'YYYY-MM-DD' for <input type="date">, or '' when there is no expiry. */
export const toDateInputValue = (value) => (value ? istDate(value) : '');

/** Human date, matching the toLocaleString('en-IN', Asia/Kolkata) style used elsewhere. */
export const formatGrantDate = (value) =>
    value ? new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '';

/** The server ignores grants whose valid_until has passed (valid_until >= CURDATE()) — mirror that. */
export const isGrantExpired = (validUntil) => !!validUntil && istDate(validUntil) < istDate(Date.now());

/**
 * The one badge a human scans a table for. Never colour-only: the word "Prime"
 * (or "Investigator only") always ships with it.
 */
export function PrimeBadge({ isPrime, className = '' }) {
    if (isPrime) {
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#AC9AFD] text-slate-800 ${className}`}>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 1.5l2.47 5.24 5.53.79-4 4.05.94 5.72L10 14.6l-4.94 2.7.94-5.72-4-4.05 5.53-.79L10 1.5z" />
                </svg>
                Prime
            </span>
        );
    }
    return (
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 ${className}`}>
            Investigator only
        </span>
    );
}

/** Quiet, uniform chips — they sit in dense tables, so they must not compete with the Prime badge. */
export function CategoryChips({ categories, max }) {
    const list = categories || [];
    if (list.length === 0) return null;

    const shown = max ? list.slice(0, max) : list;
    const hidden = list.length - shown.length;

    return (
        <div className="flex flex-wrap gap-1" title={list.map(categoryLabel).join(', ')}>
            {shown.map((c) => (
                <span key={c} className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {categoryLabel(c)}
                </span>
            ))}
            {hidden > 0 && (
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    +{hidden}
                </span>
            )}
        </div>
    );
}
