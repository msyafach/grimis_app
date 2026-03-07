export const formatDateWIB = (timestamp) => {
    const date = new Date(timestamp);
    const offsetDate = new Date(date.getTime() + 7 * 60 * 60 * 1000); // GMT+7
    return offsetDate.toISOString().replace('T', ' ').substring(0, 10);
};