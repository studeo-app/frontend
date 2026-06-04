import { apiRequest } from "@/shared/api/apiClient";
import type {
  CheckUsernameResponse,
  CompleteProfileResponse,
  ProfileStatusResponse,
  UserProfile,
} from "@/types/user";


export async function backendCheck(): Promise<void> {
  return apiRequest<void>("/health", { method: "GET" });
}

export async function fetchUserProfile(
  token: string
): Promise<ProfileStatusResponse> {
  return apiRequest<ProfileStatusResponse>("/users/profile", { token });
}

export async function checkUsernameAvailability(
  username: string
): Promise<CheckUsernameResponse> {
  const encoded = encodeURIComponent(username.trim().toLowerCase());
  return apiRequest<CheckUsernameResponse>(
    `/users/check-username/${encoded}`
  );
}

export interface CompleteProfilePayload {
  username: string;
  avatarUrl?: string;
}

export async function completeUserProfile(
  token: string,
  payload: CompleteProfilePayload
): Promise<CompleteProfileResponse> {
  return apiRequest<CompleteProfileResponse>("/users/complete-profile", {
    method: "POST",
    token,
    body: payload,
  });
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  email?: string;
}

export async function updateUserProfile(
  token: string,
  payload: UpdateProfilePayload
): Promise<UserProfile> {
  return apiRequest<UserProfile>("/users/profile", {
    method: "PATCH",
    token,
    body: payload,
  });
}

export async function deleteUserAccount(
  token: string
): Promise<{ deleted: boolean; message: string }> {
  return apiRequest<{ deleted: boolean; message: string }>("/users/profile", {
    method: "DELETE",
    token,
  });
}
