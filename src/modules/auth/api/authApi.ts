import { apiRequest } from "@/shared/api/apiClient";
import type { RegisterSyncResponse } from "@/types/user";

export interface RegisterPayload {
  firstName?: string;
  lastName?: string;
}

export async function registerOrSyncUser(
  token: string,
  payload: RegisterPayload = {}
): Promise<RegisterSyncResponse> {
  return apiRequest<RegisterSyncResponse>("/auth/register", {
    method: "POST",
    token,
    body: payload,
  });
}
