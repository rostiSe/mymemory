import { View, Text } from 'react-native';
import { Stack } from 'expo-router';

export default function SearchScreen() {
  return (
    <View className="flex-1 bg-background p-4 justify-center items-center">
      <Text className="text-foreground text-xl font-bold">Search</Text>
      <Text className="text-muted mt-2">Find your memories via semantic AI search.</Text>
    </View>
  );
}
