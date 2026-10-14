// src/services/auth.ts
import API_BASE_URL from "./api";

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
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    // Use plain fetch to avoid interceptors that might cause recursion
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Refresh failed: ${response.status}`);
    }

    const data: { access_token: string; refresh_token: string } = await response.json();
    const { access_token, refresh_token } = data;

    storeToken(access_token);
    storeRefreshToken(refresh_token);
    return access_token;
  } catch (err) {
    console.error("Refresh token error:", err);
    clearToken();
    clearRefreshToken();
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