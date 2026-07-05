export const ROLES = {
  STUDENT: "student",
  INSTRUCTOR: "instructor",
  ADMIN: "admin",
  ADVISOR: "advisor",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
