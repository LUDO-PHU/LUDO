const HAS_TIMEZONE = /(?:z|[+-]\d{2}:?\d{2})$/i;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T/;

export const parseAppDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        const normalized = ISO_DATE_TIME.test(trimmed) && !HAS_TIMEZONE.test(trimmed)
            ? `${trimmed}Z`
            : trimmed;
        const parsed = new Date(normalized);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatAppDate = (value, fallback = '—') => {
    const date = parseAppDate(value);
    return date ? date.toLocaleDateString('vi-VN') : fallback;
};

export const formatAppDateTime = (value, fallback = '—') => {
    const date = parseAppDate(value);
    return date ? date.toLocaleString('vi-VN', { hour12: false }) : fallback;
};
