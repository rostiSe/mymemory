import { CaptureComposer } from "@/features/entry/components/CaptureComposer";
import { useAuthStore } from "@/stores/providers/auth-provider";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

/**
 * Feed title and account context (no capture UI).
 */
export function FeedHeader({
  captureComposerProps,
}: {
  captureComposerProps: ComponentProps<typeof CaptureComposer>;
}) {
  const email = useAuthStore((s) => s.session?.user?.email);

  return (
    <View className="gap-2 px-screen">
      <Text className="text-2xl font-bold text-foreground">Feed</Text>
      {!!email && (
        <Text className="text-sm text-muted">Signed in as {email}</Text>
      )}
      <CaptureComposer {...captureComposerProps} />
    </View>
  );
}
