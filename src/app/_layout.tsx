import { useEffect } from "react";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native/provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { queryClient } from "@/lib/query-client";
import { AuthStoreProvider } from "@/stores/providers/auth-provider";
import { UIStoreProvider } from "@/stores/providers/ui-provider";
import { useAuthStore } from "@/stores/providers/auth-provider";
import "../global.css";

SplashScreen.preventAutoHideAsync();

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthStoreProvider>
        <UIStoreProvider>
          <QueryClientProvider client={queryClient}>
            <HeroUINativeProvider>
              <AuthInitializer>
                <Stack>
                  <Stack.Screen
                    name="index"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="(auth)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                </Stack>
              </AuthInitializer>
            </HeroUINativeProvider>
          </QueryClientProvider>
        </UIStoreProvider>
      </AuthStoreProvider>
    </GestureHandlerRootView>
  );
}
