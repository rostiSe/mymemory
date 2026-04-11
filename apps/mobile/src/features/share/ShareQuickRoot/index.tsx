import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  NativeModules,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { Uniwind } from "uniwind";
import {
  invalidateEntriesDomain,
  writeEntryRowToCaches,
} from "@/features/entry/entry-query-cache";
import { queryClient } from "@/lib/query-client";
import { orpcClient } from "@/lib/orpc";
import { bumpShareEntrySyncMarker } from "@/lib/share-quick-cache-marker";
import {
  AuthStoreProvider,
  useAuthStore,
} from "@/stores/providers/auth-provider";
import { AppStoreProvider } from "@/stores/providers/app-provider";
import { UIStoreProvider, useUIStore } from "@/stores/providers/ui-provider";
import {
  mapShareIntentToCreateInput,
  type ShareQuickInitialProps,
} from "@/features/share/utils/mapShareIntentToCreateInput";
import { ShareQuickMark } from "./ShareQuickMark";
import "../../../global.css";

type Phase = "loading" | "success" | "error";

function finishShareActivity() {
  const mod = NativeModules.ShareQuick as { finish?: () => void } | undefined;
  mod?.finish?.();
}

const ENTER_BLUR_MS = 320;
const ENTER_CONTENT_MS = 380;
const EXIT_MS = 340;
const SUCCESS_HOLD_MS = 2900;
const ERROR_HOLD_MS = 2000;

function ShareQuickInner({
  shareMimeType,
  shareAction,
  shareText,
  shareSubject,
  shareStreamUri,
  shareStreamUrisJson,
}: ShareQuickInitialProps) {
  const initialize = useAuthStore((s) => s.initialize);
  const authLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const theme = useUIStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const qc = useQueryClient();

  const foreground = useThemeColor("foreground");
  const danger = useThemeColor("danger");

  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string | null>(null);

  const blurOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(0.92)).current;
  const ranRef = useRef(false);
  const dismissingRef = useRef(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    Uniwind.setTheme(theme);
  }, [theme]);

  // useLayoutEffect: run before paint so opacity 0 → 1 is visible (useEffect runs too late on RN).
  useLayoutEffect(() => {
    const enter = Animated.parallel([
      Animated.timing(blurOpacity, {
        toValue: 1,
        duration: ENTER_BLUR_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(40),
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: ENTER_CONTENT_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(markScale, {
            toValue: 1,
            friction: 8,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);
    enter.start();
    return () => enter.stop();
  }, [blurOpacity, contentOpacity, markScale]);

  const dismissWithFadeOut = () => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    Animated.parallel([
      Animated.timing(blurOpacity, {
        toValue: 0,
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: EXIT_MS - 40,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) finishShareActivity();
    });
  };

  useEffect(() => {
    if (authLoading || ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      if (!isAuthenticated) {
        setPhase("error");
        setMessage("Sign in to MyMemory in the app first.");
        setTimeout(dismissWithFadeOut, ERROR_HOLD_MS);
        return;
      }

      const mapped = mapShareIntentToCreateInput({
        shareMimeType,
        shareAction,
        shareText,
        shareSubject,
        shareStreamUri,
        shareStreamUrisJson,
      });
      if (!mapped.ok) {
        setPhase("error");
        setMessage(mapped.message);
        setTimeout(dismissWithFadeOut, ERROR_HOLD_MS);
        return;
      }

      try {
        const entry = await orpcClient.entries.create(mapped.input);
        writeEntryRowToCaches(qc, entry);
        bumpShareEntrySyncMarker(entry.id);
        void orpcClient.ai
          .ingest({ entryId: entry.id })
          .then((result) => {
            writeEntryRowToCaches(qc, result.data);
            bumpShareEntrySyncMarker(entry.id);
          })
          .catch((err: unknown) => {
            console.error("[ShareQuick ai.ingest]", err);
            invalidateEntriesDomain(qc);
            bumpShareEntrySyncMarker(entry.id);
          });

        setPhase("success");
        setMessage("Text saved");
        setTimeout(dismissWithFadeOut, SUCCESS_HOLD_MS);
      } catch (err) {
        console.error("[ShareQuick create]", err);
        setPhase("error");
        setMessage("Couldn\u2019t save. Try again.");
        setTimeout(dismissWithFadeOut, ERROR_HOLD_MS);
      }
    };

    void run();
  }, [
    authLoading,
    isAuthenticated,
    shareMimeType,
    shareAction,
    shareText,
    shareSubject,
    shareStreamUri,
    shareStreamUrisJson,
    qc,
  ]);

  const messageColor = phase === "error" ? danger : foreground;

  const isDark =
    theme === "dark" ||
    (theme === "system" && systemScheme === "dark");
  const blurTint = isDark ? "dark" : "light";

  return (
    <View className="flex-1">
      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={[StyleSheet.absoluteFill, { opacity: blurOpacity }]}
      >
        <BlurView
          intensity={52}
          tint={blurTint}
          style={StyleSheet.absoluteFill}
        />
        <View
          className={isDark ? "bg-black/35" : "bg-black/25"}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        className="flex-1 items-center justify-center px-(--spacing-screen)"
        collapsable={false}
        style={{ opacity: contentOpacity }}
      >
        <Animated.View
          className="items-center gap-4"
          style={{
            transform: [{ scale: markScale }],
          }}
        >
          <ShareQuickMark color={foreground} size={76} />
          {phase === "loading" ? (
            <Text className="text-center text-base text-muted">Saving\u2026</Text>
          ) : (
            <Text
              className="text-center text-lg font-semibold leading-tight"
              style={{ color: messageColor }}
            >
              {message ?? ""}
            </Text>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * Second React root for Android ShareQuickActivity (Tier B). Registers as `ShareQuickRoot`.
 */
export function ShareQuickRoot(props: ShareQuickInitialProps) {
  return (
    <GestureHandlerRootView className="flex-1">
      <AppStoreProvider>
        <AuthStoreProvider>
          <UIStoreProvider>
            <QueryClientProvider client={queryClient}>
              <HeroUINativeProvider>
                <ShareQuickInner {...props} />
              </HeroUINativeProvider>
            </QueryClientProvider>
          </UIStoreProvider>
        </AuthStoreProvider>
      </AppStoreProvider>
    </GestureHandlerRootView>
  );
}
