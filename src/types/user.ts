export type AuthProvider = "password" | "google";

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  authProvider: AuthProvider;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestedProfile {
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
}

export interface RegisterSyncResponse {
  uid: string;
  profileComplete: boolean;
  message: string;
  user: UserProfile;
}

export interface ProfileStatusResponse {
  profileComplete: boolean;
  needsProfile: boolean;
  authProvider: AuthProvider;
  user: UserProfile | null;
  suggestedProfile: SuggestedProfile | null;
}

export interface CompleteProfileResponse {
  profileComplete: boolean;
  user: UserProfile;
}

export interface CheckUsernameResponse {
  username: string;
  available: boolean;
}
