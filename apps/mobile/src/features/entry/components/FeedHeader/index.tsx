import { useAuthStore } from "@/stores/providers/auth-provider";
import { Text, View } from "react-native";
import { CaptureComposer } from "../CaptureComposer";

/**
 * Feed title and account context (no capture UI).
 */
export function FeedHeader() {
  const email = useAuthStore((s) => s.session?.user?.email);

  return (
    <View className="gap-2 px-screen">
      <Text className="text-2xl font-bold text-foreground">Feed</Text>
      {!!email && (
        <Text className="text-sm text-muted">Signed in as {email}</Text>
      )}
      <CaptureComposer />
    </View>
  );
}
