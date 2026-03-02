import { Todo } from "@/types/todo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch(`${API_BASE}/todos`);
  return handleResponse<Todo[]>(res);
}

export async function createTodo(title: string): Promise<Todo> {
  const res = await fetch(`${API_BASE}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, completed: false }),
  });
  return handleResponse<Todo>(res);
}

export async function updateTodo(
  id: number,
  data: Partial<Pick<Todo, "title" | "completed">>
): Promise<Todo> {
  const res = await fetch(`${API_BASE}/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Todo>(res);
}

export async function deleteTodo(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/todos/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${text}`);
  }
}
