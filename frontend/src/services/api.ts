// src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
import apiClient from "./apiClient";
import axios from "axios";

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("auth:expired"));
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    let error: ApiError = { detail: "An unexpected error occurred." };
    try {
      error = await response.json();
    } catch {
      /* non-JSON body */
    }
    throw new Error(parseApiError(error));
  }

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
  const response = await fetch(`${API_BASE_URL}/auth/jwt/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return handleResponse<LoginResponse>(response);
}

/**
 * POST /auth/jwt/logout
 */
export async function logoutUser(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/jwt/logout`, {
    method: "POST",
    headers: authHeaders(),
  }).catch(() => {});
}

/**
 * POST /auth/register
 * Body: application/json { email, password, username, full_name?, role }
 * Matches UserCreate in schema.py
 */
export async function registerUser(
  credentials: RegisterCredentials,
): Promise<UserRead> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(credentials),
  });
  return handleResponse<UserRead>(response);
}

// ─── User endpoints ───────────────────────────────────────────────────────────

/** GET /users/me */
export async function getCurrentUser(): Promise<UserRead> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: authHeaders(),
  });
  return handleResponse<UserRead>(response);
}

/** GET /users/me/profile (your custom route) */
export async function getMyProfile(): Promise<UserRead> {
  const response = await fetch(`${API_BASE_URL}/users/me/profile`, {
    headers: authHeaders(),
  });
  return handleResponse<UserRead>(response);
}

export async function getUserByEmail(email: string): Promise<UserRead | null> {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/user/${email}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    console.error("Failed to get user");
    throw error;
  }
}

export async function getUserByEmailAndRole(
  email: string,
  role: string,
): Promise<UserRead[] | null> {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/users/search_users`, {
      params: {
        email: email,
        role: role,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.error("User does not exist");
      return null;
    }
    console.error("Failed to get user", error);
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
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handleResponse<UserRead>(response);
}

// ─── Token storage ────────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  return localStorage.getItem("access_token");
}

export function storeToken(token: string): void {
  localStorage.setItem("access_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("access_token");
}
