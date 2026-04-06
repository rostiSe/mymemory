import { View, Text } from "react-native";
import { useAuthStore } from "@/stores/providers/auth-provider";

export default function FeedScreen() {
  const email = useAuthStore((s) => s.session?.user?.email);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <Text className="text-2xl font-semibold text-foreground">MyMemory</Text>
      {email && (
        <Text className="text-sm text-muted">Signed in as {email}</Text>
      )}
      <Text className="text-sm text-muted">Your feed will appear here</Text>
    </View>
  );
}
