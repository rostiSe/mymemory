import { useLintWiki } from "@/features/wiki/hooks/useWikiMutations";
import { useCompilationStatus } from "@/features/wiki/hooks/useWikiPages";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuthStore } from "@/stores/providers/auth-provider";
import { useUIStore } from "@/stores/providers/ui-provider";
import type { ThemeMode } from "@/stores/ui.store";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Button, ListGroup } from "heroui-native";
import { ScrollView, Text, View } from "react-native";

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

function formatWikiTimestamp(value: string | Date | null | undefined): string {
  if (value == null) return "—";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function SettingsScreen() {
  const email = useAuthStore((s) => s.session?.user?.email);
  const signOut = useAuthStore((s) => s.signOut);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const toast = useAppToast();
  const { data: wikiStatus } = useCompilationStatus();
  const lintWiki = useLintWiki();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.info("Signed out");
    } catch (e) {
      toast.error(
        "Sign out failed",
        e instanceof Error ? e.message : "Unknown error",
      );
    }
  };

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 px-4 pb-32 pt-4">
        <View className="gap-2">
          <Text className="px-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Appearance
          </Text>
          <ListGroup>
            {THEME_OPTIONS.map((option) => (
              <ListGroup.Item
                key={option.value}
                onPress={() => setTheme(option.value)}
              >
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{option.label}</ListGroup.ItemTitle>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  {theme === option.value && (
                    <Text className="text-sm text-accent">✓</Text>
                  )}
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </View>

        <View className="gap-2">
          <Text className="px-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Wiki
          </Text>
          <ListGroup>
            <ListGroup.Item>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Compilation status</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {wikiStatus?.status === "compiling"
                    ? "Compiling…"
                    : wikiStatus?.status === "failed"
                      ? "Last run failed"
                      : "Idle"}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
            </ListGroup.Item>
            <ListGroup.Item>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Last compiled</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {formatWikiTimestamp(wikiStatus?.lastCompiledAt)}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
            </ListGroup.Item>
            <ListGroup.Item
              onPress={() => {
                if (lintWiki.isPending) return;
                lintWiki.mutate(undefined, {
                  onSuccess: (result) => {
                    const n = result.issues.length;
                    if (n === 0) {
                      toast.info("Wiki health", "No issues — wiki looks healthy.");
                    } else {
                      toast.info(
                        "Wiki health check",
                        `${n} issue${n === 1 ? "" : "s"} found. Open Spaces for the full report.`,
                      );
                    }
                  },
                });
              }}
            >
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>
                  {lintWiki.isPending ? "Running health check…" : "Run health check"}
                </ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  Lint wiki content for gaps and inconsistencies
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
            </ListGroup.Item>
          </ListGroup>
        </View>

        <View className="gap-2">
          <Text className="px-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Account
          </Text>
          <ListGroup>
            <ListGroup.Item>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Email</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {email ?? "Not signed in"}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
            </ListGroup.Item>
          </ListGroup>

          <Button variant="danger" onPress={handleSignOut} className="mt-2">
            Sign Out
          </Button>
        </View>

        {__DEV__ && (
          <View className="gap-2">
            <Text className="px-2 text-xs font-semibold uppercase tracking-widest text-muted">
              Developer
            </Text>
            <ListGroup>
              <ListGroup.Item onPress={() => router.push("/debug")}>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Debug Info</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    Inspect stores, storage, and environment
                  </ListGroup.ItemDescription>
                </ListGroup.ItemContent>
              </ListGroup.Item>
            </ListGroup>
          </View>
        )}

        <View className="gap-2">
          <Text className="px-2 text-xs font-semibold uppercase tracking-widest text-muted">
            About
          </Text>
          <ListGroup>
            <ListGroup.Item>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Version</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {appVersion}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
            </ListGroup.Item>
            <ListGroup.Item>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Expo SDK</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {Constants.expoConfig?.sdkVersion ?? "Unknown"}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
            </ListGroup.Item>
          </ListGroup>
        </View>
      </View>
    </ScrollView>
  );
}
