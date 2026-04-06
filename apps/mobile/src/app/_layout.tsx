import { ErrorBoundary } from "@/components/error-boundary";
import { queryClient } from "@/lib/query-client";
import { AppStoreProvider } from "@/stores/providers/app-provider";
import { AuthStoreProvider, useAuthStore } from "@/stores/providers/auth-provider";
import { UIStoreProvider, useUIStore } from "@/stores/providers/ui-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Uniwind } from "uniwind";
import "../global.css";

SplashScreen.preventAutoHideAsync();

/**
 * Inner layout that has access to all providers (auth, UI, HeroUI theme).
 * Handles auth initialization, theme syncing, and splash screen.
 * Renders the root Stack with theme-aware header styling.
 */
function AppShell() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const theme = useUIStore((s) => s.theme);

  const backgroundColor = useThemeColor("background");
  const foregroundColor = useThemeColor("foreground");

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    Uniwind.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(backgroundColor);
  }, [backgroundColor]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor },
        headerTintColor: foregroundColor,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="debug" options={{ title: "Debug" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppStoreProvider>
        <AuthStoreProvider>
          <UIStoreProvider>
            <QueryClientProvider client={queryClient}>
              <HeroUINativeProvider>
                <ErrorBoundary>
                  <AppShell />
                </ErrorBoundary>
              </HeroUINativeProvider>
            </QueryClientProvider>
          </UIStoreProvider>
        </AuthStoreProvider>
      </AppStoreProvider>
    </GestureHandlerRootView>
  );
}
