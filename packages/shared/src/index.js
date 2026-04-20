export const daysOfWeek = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY"
];
export const trimesterLabels = {
    FIRST: "1st Trimester",
    SECOND: "2nd Trimester",
    THIRD: "3rd Trimester"
};
export const strandOptions = [
    "Business and Entrepreneurship",
    "Arts",
    "Humanities and Social Sciences",
    "STEM - Engineering",
    "STEM - Allied Health",
    "Tech-Pro - ICT & HE"
];
export function listWeekdays() {
    return [...daysOfWeek];
}
export function listStrands() {
    return [...strandOptions];
}
