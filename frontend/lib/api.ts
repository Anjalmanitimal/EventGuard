const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ApiErrorBody = { error?: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((body as ApiErrorBody).error || `Request failed with status ${res.status}`);
  }

  return body as T;
}

export type User = {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
};

export function register(email: string, password: string) {
  return request<{ id: string; email: string; role: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function verifyEmail(token: string) {
  return request<{ message: string }>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function login(email: string, password: string) {
  return request<{ accessToken: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function refresh() {
  return request<{ accessToken: string }>("/api/auth/refresh", { method: "POST" });
}

export function logout() {
  return request<void>("/api/auth/logout", { method: "POST" });
}

export function me(accessToken: string) {
  return request<User>("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
