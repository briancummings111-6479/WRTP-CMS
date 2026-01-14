export const toInputDateString = (timestamp?: number | string | Date | null): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    // Use UTC parts because input type="date" valueAsNumber returns UTC midnight
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const getTodayAsUTC = (): number => {
    const today = new Date();
    // Return a timestamp where the UTC date matches the current Local date.
    return Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
};
