export const educationStages = ["primary", "secondary", "university", "working"] as const;
export const preferredSubjects = ["english", "math", "explore"] as const;

export function validEducationStage(value: unknown) {
  return value === null || (typeof value === "string" && (educationStages as readonly string[]).includes(value));
}
export function validPreferredSubject(value: unknown) {
  return value === null || (typeof value === "string" && (preferredSubjects as readonly string[]).includes(value));
}
