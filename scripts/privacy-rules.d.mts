export const RULES: { name: string; test: (line: string) => boolean }[];
export function findIssues(text: string): { rule: string; line: number; text: string }[];
