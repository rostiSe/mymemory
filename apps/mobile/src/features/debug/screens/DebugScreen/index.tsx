import { useAppToast } from "@/hooks/useAppToast";
import { storage } from "@/lib/mmkv";
import { useAuthStore } from "@/stores/providers/auth-provider";
import { useUIStore } from "@/stores/providers/ui-provider";
import Constants from "expo-constants";
import { router, Stack } from "expo-router";
import { Button, Card, Separator } from "heroui-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm font-semibold uppercase tracking-wide">
          {title}
        </Card.Title>
      </Card.Header>
      <Card.Body className="gap-2">{children}</Card.Body>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="max-w-[60%] text-right font-mono text-sm text-foreground">
        {value}
      </Text>
    </View>
  );
}

function CrashButton() {
  const [shouldCrash, setShouldCrash] = useState(false);
  if (shouldCrash) {
    throw new Error("Intentional crash from debug screen");
  }
  return (
    <Button variant="danger" onPress={() => setShouldCrash(true)}>
      Force Crash (Test Error Boundary)
    </Button>
  );
}

function TemplateTestButton() {
  return (
    <Button variant="primary" onPress={() => router.push("/template-test")}>
      Template Test
    </Button>
  );
}

export default function DebugScreen() {
  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const signOut = useAuthStore((s) => s.signOut);

  const theme = useUIStore((s) => s.theme);
  const activeTab = useUIStore((s) => s.activeTab);
  const searchFilters = useUIStore((s) => s.searchFilters);

  const toast = useAppToast();

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "not set";
  const maskedUrl =
    supabaseUrl.length > 20 ? supabaseUrl.slice(0, 20) + "..." : supabaseUrl;

  const mmkvKeys = storage.getAllKeys();

  const handleClearMMKV = () => {
    storage.clearAll();
    toast.warning("MMKV cleared", "Restart the app to see the effect");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.info("Signed out from debug");
    } catch (e) {
      toast.error("Failed", e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Debug", headerShown: true }} />
      <ScrollView className="flex-1 bg-background">
        <View className="gap-4 px-4 py-6">
          <Section title="Auth State">
            <Row label="Authenticated" value={String(isAuthenticated)} />
            <Row label="Loading" value={String(isLoading)} />
            <Row label="Email" value={session?.user?.email ?? "none"} />
            <Row label="User ID" value={session?.user?.id ?? "none"} />
            <Row
              label="Token Expiry"
              value={
                session?.expires_at
                  ? new Date(session.expires_at * 1000).toLocaleString()
                  : "none"
              }
            />
          </Section>

          <Section title="UI Store">
            <Row label="Theme" value={theme} />
            <Row label="Active Tab" value={activeTab} />
            <Row label="Search Filters" value={JSON.stringify(searchFilters)} />
          </Section>

          <Section title="MMKV Storage">
            <Row label="Total Keys" value={String(mmkvKeys.length)} />
            <Separator className="my-1" />
            {mmkvKeys.map((key) => (
              <Row
                key={key}
                label={key}
                value={storage.getString(key) ?? "(non-string)"}
              />
            ))}
            {mmkvKeys.length === 0 && (
              <Text className="text-sm text-muted">No keys stored</Text>
            )}
          </Section>

          <Section title="Environment">
            <Row label="Supabase URL" value={maskedUrl} />
            <Row
              label="App Version"
              value={Constants.expoConfig?.version ?? "unknown"}
            />
            <Row
              label="SDK Version"
              value={Constants.expoConfig?.sdkVersion ?? "unknown"}
            />
            <Row label="__DEV__" value={String(__DEV__)} />
          </Section>

          <Section title="Actions">
            <View className="gap-3">
              <Button variant="secondary" onPress={handleClearMMKV}>
                Clear MMKV Storage
              </Button>
              <Button variant="danger" onPress={handleSignOut}>
                Sign Out
              </Button>
              <CrashButton />
              <TemplateTestButton />
            </View>
          </Section>
        </View>
      </ScrollView>
    </>
  );
}
