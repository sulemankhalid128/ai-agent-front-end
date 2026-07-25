const API_BASE = process.env.NEXT_PUBLIC_AGENT_API_BASE ?? "http://localhost:3001";

export type FeedKnowledgePayload = {
  text: string;
  files: File[];
  /** Optional display name for custom text ingest */
  fileName?: string;
  /** Seed company-policy.txt from backend */
  useCompanyPolicy?: boolean;
};

export type FeedKnowledgeResult = {
  success: boolean;
  message?: string;
};

async function readError(response: Response): Promise<string> {
  let message = `Request failed (${response.status})`;
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    message = data.error ?? data.message ?? message;
  } catch {
    // ignore parse errors
  }
  return message;
}

/** POST /rag/upload — multipart field name: file */
export async function uploadRagFile(file: File): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/rag/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  try {
    return await response.json();
  } catch {
    return { success: true };
  }
}

/** POST /rag/ingest-text — JSON body */
export async function ingestRagText(options: {
  text?: string;
  fileName?: string;
  useCompanyPolicy?: boolean;
}): Promise<unknown> {
  const body = options.useCompanyPolicy
    ? { useCompanyPolicy: true }
    : {
        text: options.text ?? "",
        fileName: options.fileName?.trim() || "notes.txt",
      };

  const response = await fetch(`${API_BASE}/rag/ingest-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  try {
    return await response.json();
  } catch {
    return { success: true };
  }
}

/**
 * Feed knowledge using:
 *   - POST /rag/upload for each file
 *   - POST /rag/ingest-text for custom text or company policy seed
 */
export async function feedKnowledge(
  payload: FeedKnowledgePayload,
): Promise<FeedKnowledgeResult> {
  const trimmed = payload.text.trim();
  const parts: string[] = [];

  if (payload.useCompanyPolicy) {
    await ingestRagText({ useCompanyPolicy: true });
    parts.push("company policy");
  }

  if (trimmed) {
    await ingestRagText({
      text: trimmed,
      fileName: payload.fileName?.trim() || "notes.txt",
    });
    parts.push("text");
  }

  for (const file of payload.files) {
    await uploadRagFile(file);
  }
  if (payload.files.length > 0) {
    parts.push(
      `${payload.files.length} file${payload.files.length === 1 ? "" : "s"}`,
    );
  }

  if (parts.length === 0) {
    throw new Error("Add some text, a file, or seed the company policy.");
  }

  return {
    success: true,
    message: `Fed ${parts.join(" and ")} successfully.`,
  };
}
