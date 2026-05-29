import { useEffect, useState } from "react";
import { checkUsernameAvailability } from "@/modules/users/api/usersApi";
import { resolveCompleteProfileErrorMessage } from "../utils/completeProfileErrors";

export function useUsernameAvailability(username: string, enabled: boolean) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || username.trim().length < 3) {
      setChecking(false);
      setAvailable(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setChecking(true);
      setError(null);

      try {
        const result = await checkUsernameAvailability(username);
        if (!cancelled) {
          setAvailable(result.available);
        }
      } catch (err) {
        if (!cancelled) {
          setAvailable(null);
          setError(resolveCompleteProfileErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username, enabled]);

  return { checking, available, error };
}
