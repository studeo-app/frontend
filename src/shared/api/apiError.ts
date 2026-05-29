export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Ocurrió un error inesperado."
): string {
  if (error instanceof ApiError) {
    if (typeof error.body === "object" && error.body !== null) {
      const body = error.body as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        return body.message.join(", ");
      }
      if (typeof body.message === "string") {
        return body.message;
      }
    }
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
