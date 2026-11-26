export const isBusinessDay = (date: Date): boolean => {
    const day = date.getDay();
    // 0 = Sunday, 6 = Saturday
    return day !== 0 && day !== 6;
};

export const getNextBusinessDay = (date: Date): Date => {
    const nextDate = new Date(date);
    // If it's Saturday (6), add 2 days -> Monday
    // If it's Sunday (0), add 1 day -> Monday
    // But wait, if a deadline falls on a weekend, it is usually postponed to the next business day.
    // We first check the original date.

    // Simple logic: keep adding 1 day until it's a business day.
    // Note: This doesn't account for holidays. For a robust system, we'd need a holiday library/API.
    // For this scope, weekends are the main concern.

    while (!isBusinessDay(nextDate)) {
        nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
};

export const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const getMonthDateRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end };
};
