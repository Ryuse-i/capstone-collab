const STORAGE_KEY = "psu:last-visited:projects";

/**
 * Remembers the current path within the instructor Projects section
 * (ProjectList or ProjectView), so the sidebar's "Projects" item can
 * return the user to where they left off.
 */
export function rememberLastVisitedProjects(path: string) {
  try {
    localStorage.setItem(STORAGE_KEY, path);
  } catch {
    // localStorage unavailable (privacy mode, etc.) - fail silently
  }
}

export function getLastVisitedProjects(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}