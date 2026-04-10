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

export default function SettingsScreen() {
  const email = useAuthStore((s) => s.session?.user?.email);
  const signOut = useAuthStore((s) => s.signOut);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const toast = useAppToast();

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
