/** Shared backend base URL for the agent API */
export const API_BASE =
  process.env.NEXT_PUBLIC_AGENT_API_BASE ?? "http://localhost:3001";

export async function readApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    if (data.error) return data.error;
    if (data.message) return data.message;
  } catch {
    // ignore JSON parse errors
  }
  return `Request failed (${response.status})`;
}
