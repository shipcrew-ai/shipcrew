const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed (${res.status})`
    );
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const todosApi = {
  getAll: (): Promise<Todo[]> => request<Todo[]>('/todos'),

  create: (title: string): Promise<Todo> =>
    request<Todo>('/todos', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  update: (id: number, patch: Partial<Pick<Todo, 'title' | 'completed'>>): Promise<Todo> =>
    request<Todo>(`/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  delete: (id: number): Promise<void> =>
    request<void>(`/todos/${id}`, { method: 'DELETE' }),
};
