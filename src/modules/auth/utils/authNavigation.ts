export function getPostAuthPath(profileComplete: boolean): string {
  return profileComplete ? "/dashboard" : "/complete-profile";
}
