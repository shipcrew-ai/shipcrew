const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("shipcrew_token");
}

export function setToken(token: string): void {
  localStorage.setItem("shipcrew_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("shipcrew_token");
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
    }
    const body = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
