export function parseJsonArray(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toJsonString(arr: string[]): string {
  return JSON.stringify(arr);
}

export function toJson(value: unknown): string {
  return JSON.stringify(value);
}

export function parseJson(value: string | null | undefined): unknown {
  if (typeof value !== "string" || !value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
