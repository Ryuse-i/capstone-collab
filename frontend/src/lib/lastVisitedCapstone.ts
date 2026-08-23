const STORAGE_KEY = "psu:last-visited:capstone";

/**
 * Remembers the current path within the Capstone section
 * (CapstoneSearch or CapstoneView), so the sidebar's "Capstone Search"
 * item can return the user to where they left off.
 */
export function rememberLastVisitedCapstone(path: string) {
  try {
    localStorage.setItem(STORAGE_KEY, path);
  } catch {
    // localStorage unavailable (privacy mode, etc.) - fail silently
  }
}

export function getLastVisitedCapstone(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}