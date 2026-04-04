import { View, Text } from "react-native";
import { Button } from "heroui-native";
import { useAuthStore } from "@/stores/providers/auth-provider";

export default function FeedScreen() {
  const email = useAuthStore((s) => s.session?.user?.email);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <Text className="text-lg text-foreground">Welcome to MyMemory</Text>
      {email && (
        <Text className="text-sm text-default-500">Signed in as {email}</Text>
      )}
      <Button variant="danger" onPress={signOut}>
        Sign Out
      </Button>
    </View>
  );
}
