// src/services/auth.ts
import API_BASE_URL from "./config";

/**
 * Token storage functions
 */
export function getStoredToken(): string | null {
  return localStorage.getItem("access_token");
}

export function storeToken(token: string): void {
  localStorage.setItem("access_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("access_token");
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
}

export function storeRefreshToken(token: string): void {
  localStorage.setItem("refresh_token", token);
}

export function clearRefreshToken(): void {
  localStorage.removeItem("refresh_token");
}

/**
 * Refresh token handling with deduplication
 */
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh access token using refresh token.
 * Returns new access token or null if refresh failed.
 * Uses a shared promise to prevent concurrent refresh requests.
 */
export function refreshAccessTokenOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = navigator.locks
      .request("auth-refresh", async () => {
        const before = getStoredRefreshToken();
        const token = await refreshAccessToken();
        // Another tab may have refreshed while we waited for the lock
        return token ?? (before !== getStoredRefreshToken() ? getStoredToken() : null);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function refreshAccessToken(): Promise<string | null> {
  const usedRefreshToken = getStoredRefreshToken();
  if (!usedRefreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: usedRefreshToken }),
    });

    if (!response.ok) {
      // Another call/tab may have already rotated the token
      const current = getStoredRefreshToken();
      if (current && current !== usedRefreshToken) {
        return getStoredToken();
      }
      // Only a real auth rejection means the session is dead
      if (response.status === 401 || response.status === 400) {
        clearToken();
        clearRefreshToken();
      }
      return null;
    }

    const { access_token, refresh_token }: { access_token: string; refresh_token: string } =
      await response.json();
    storeToken(access_token);
    storeRefreshToken(refresh_token);
    return access_token;
  } catch (err) {
    // Network error: don't wipe tokens or log the user out
    console.error("Refresh token error:", err);
    return null;
  }
}

/**
 * Force logout by clearing tokens and dispatching auth:expired event
 */
export function forceLogout() {
  clearToken();
  clearRefreshToken();
  window.dispatchEvent(new Event("auth:expired"));
}