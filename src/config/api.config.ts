const apiUrl = import.meta.env.VITE_API_URL as string | undefined;

export const API_BASE_URL =
  apiUrl?.replace(/\/$/, "") ?? "http://localhost:3000/api";
