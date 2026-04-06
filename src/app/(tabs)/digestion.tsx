import { View, Text } from 'react-native';
import { Stack } from 'expo-router';

export default function DigestionScreen() {
  return (
    <View className="flex-1 bg-background p-4 justify-center items-center">
      <Text className="text-foreground text-xl font-bold">Digestion</Text>
      <Text className="text-muted mt-2">Periodic summaries and interconnected insights.</Text>
    </View>
  );
}
