import { useEffect } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/providers/auth-provider";

export default function IndexRedirectScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, isLoading]);

  return null;
}
