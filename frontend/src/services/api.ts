// src/services/api.ts
import API_BASE_URL from "./config";
import {
  getStoredToken,
  getStoredRefreshToken,
  storeToken,
  storeRefreshToken,
  clearToken,
  clearRefreshToken,
  refreshAccessTokenOnce,
  forceLogout,
} from "./auth";

export default API_BASE_URL;

// Re-export so existing `import { ... } from "./api"` statements keep working
export {
  getStoredToken,
  getStoredRefreshToken,
  storeToken,
  storeRefreshToken,
  clearToken,
  clearRefreshToken,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "student" | "instructor" | "advisor" | "admin";

export interface FastAPIErrorDetail {
  code: string;
  reason: string;
}

export interface ApiError {
  detail: string | FastAPIErrorDetail[];
}

/** POST /auth/jwt/login → OAuth2 bearer response */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

/** POST /auth/refresh-token → same structure as login */
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

/**
 * Matches UserRead in schema.py
 * username: str           → always present
 * full_name: str | None   → optional
 * role: UserRole          → student | instructor | advisor
 */
export interface UserRead {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  role?: UserRole;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

/**
 * Matches UserCreate in schema.py
 * username: str           → required
 * full_name: str | None   → optional (defaults to None on backend)
 * role: UserRole          → required on registration
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
}

/**
 * Matches UserUpdate in schema.py
 * All fields optional — only send what changed
 */
export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  password?: string;
}

// ─── Error helpers ────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  LOGIN_BAD_CREDENTIALS: "Incorrect email or password.",
  LOGIN_USER_NOT_VERIFIED: "Please verify your email before signing in.",
  REGISTER_USER_ALREADY_EXISTS: "An account with this email already exists.",
  REGISTER_INVALID_PASSWORD: "Password does not meet the requirements.",
};

function parseApiError(error: ApiError): string {
  if (typeof error.detail === "string") return error.detail;
  if (Array.isArray(error.detail) && error.detail.length > 0) {
    const first = error.detail[0];
    return ERROR_MESSAGES[first.code] ?? first.reason ?? "An error occurred.";
  }
  return "An unexpected error occurred.";
}

// ─── Core fetch with refresh logic ───────────────────────────────────────────

async function throwApiError(response: Response): Promise<never> {
  let error: ApiError = { detail: "An unexpected error occurred." };
  try {
    error = await response.json();
  } catch {
    /* non-JSON body */
  }
  throw new Error(parseApiError(error));
}

/**
 * Fetch JSON. On a 401, refresh the access token once (shared with every other
 * caller via refreshAccessTokenOnce) and retry the request. Only a failed
 * refresh logs the user out.
 *
 * Pass retryOn401 = false for endpoints where a 401 is a normal answer
 * (e.g. login with bad credentials).
 */
export async function fetchWithRefresh<T>(
  url: string,
  init: RequestInit = {},
  retryOn401 = true,
): Promise<T> {
  let response = await fetch(url, init);

  if (response.status === 401 && retryOn401) {
    const newAccessToken = await refreshAccessTokenOnce();
    if (!newAccessToken) {
      forceLogout();
      throw new Error("Session expired. Please log in again.");
    }
    response = await fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${newAccessToken}`,
      },
    });
  }

  if (!response.ok) await throwApiError(response);
  return response.json() as Promise<T>;
}

// ─── Auth header helper ───────────────────────────────────────────────────────

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getStoredToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

/**
 * POST /auth/jwt/login
 * Body: application/x-www-form-urlencoded { username (=email), password }
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const body = new URLSearchParams({ username: email, password });
  const response = await fetchWithRefresh<LoginResponse>(
    `${API_BASE_URL}/auth/jwt/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
    false, // a 401 here means bad credentials, not an expired session
  );
  storeToken(response.access_token);
  storeRefreshToken(response.refresh_token);
  return response;
}

/**
 * POST /auth/jwt/logout
 * Tokens are always cleared, even if the request fails.
 */
export async function logoutUser(): Promise<void> {
  try {
    await fetchWithRefresh<void>(
      `${API_BASE_URL}/auth/jwt/logout`,
      {
        method: "POST",
        headers: authHeaders(),
      },
      false,
    );
  } finally {
    clearToken();
    clearRefreshToken();
  }
}

/**
 * POST /auth/register
 * Body: application/json { email, password, username, full_name?, role }
 * Matches UserCreate in schema.py
 */
export async function registerUser(
  credentials: RegisterCredentials,
): Promise<UserRead> {
  return await fetchWithRefresh<UserRead>(
    `${API_BASE_URL}/auth/register`,
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(credentials),
    },
    false,
  );
}

// ─── User endpoints ───────────────────────────────────────────────────────────

/** GET /users/me */
export async function getCurrentUser(): Promise<UserRead> {
  return await fetchWithRefresh<UserRead>(`${API_BASE_URL}/users/me`, {
    headers: authHeaders(),
  });
}

/** GET /users/me/profile (your custom route) */
export async function getMyProfile(): Promise<UserRead> {
  return await fetchWithRefresh<UserRead>(`${API_BASE_URL}/users/me/profile`, {
    headers: authHeaders(),
  });
}

export async function getUserByEmail(email: string): Promise<UserRead | null> {
  try {
    // The endpoint returns the UserRead object directly (not wrapped)
    return await fetchWithRefresh<UserRead>(`${API_BASE_URL}/user/${email}`, {
      headers: authHeaders(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

export async function getUserByEmailAndRole(
  email: string,
  role: string,
): Promise<UserRead[] | null> {
  try {
    // Build URL with query parameters
    const url = `${API_BASE_URL}/users/search_users?email=${encodeURIComponent(
      email,
    )}&role=${encodeURIComponent(role)}`;
    // The endpoint returns the UserRead[] array directly (not wrapped)
    return await fetchWithRefresh<UserRead[]>(url, {
      headers: authHeaders(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

/**
 * PATCH /users/me
 * Body: application/json — only send changed fields (UserUpdate in schema.py)
 */
export async function updateCurrentUser(
  payload: UpdateUserPayload,
): Promise<UserRead> {
  return await fetchWithRefresh<UserRead>(`${API_BASE_URL}/users/me`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}