import { useEffect } from "react";
import { Stack } from "expo-router";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { useSyncReactQueryAppFocus } from "@/hooks/useSyncReactQueryAppFocus";
import { useEntrySync } from "@/features/entry/hooks/useEntrySync";
import { queryClient } from "@/lib/query-client";
import {
  AuthStoreProvider,
  useAuthStore,
} from "@/stores/providers/auth-provider";
import { AppStoreProvider } from "@/stores/providers/app-provider";
import { UIStoreProvider, useUIStore } from "@/stores/providers/ui-provider";
import { Uniwind } from "uniwind";
import * as SystemUI from "expo-system-ui";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { heroUIConfig } from "@/theme/heroui";
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

  useSyncReactQueryAppFocus();
  useEntrySync();

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
      <Stack.Screen name="space/[id]" options={{ title: "Space" }} />
      <Stack.Screen
        name="entry/[id]"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerTintColor: foregroundColor,
          headerStyle: { backgroundColor: "transparent" },
          headerShadowVisible: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor },
        }}
      />
      <Stack.Screen
        name="wiki/[id]"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerTintColor: foregroundColor,
          headerStyle: { backgroundColor: "transparent" },
          headerShadowVisible: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor },
        }}
      />
      <Stack.Screen
        name="wiki/versions"
        options={{
          title: "Version history",
          presentation: "modal",
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

/** Expo Router `ExpoRoot` provides `SafeAreaProvider` — use `useSafeAreaInsets()` without duplicating the provider here. */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppStoreProvider>
        <AuthStoreProvider>
          <UIStoreProvider>
            <QueryClientProvider client={queryClient}>
              <HeroUINativeProvider config={heroUIConfig}>
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
