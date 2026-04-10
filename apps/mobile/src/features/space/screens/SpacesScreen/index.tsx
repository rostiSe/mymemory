import { View, Text } from "react-native";

export default function SpacesScreen() {
  return (
    <View className="flex-1 bg-background p-4 justify-center items-center">
      <Text className="text-foreground text-xl font-bold">Spaces</Text>
      <Text className="text-muted mt-2">
        Explore auto-categorized clusters of knowledge.
      </Text>
    </View>
  );
}
