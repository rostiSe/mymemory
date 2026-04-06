import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function DigestDetailScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View className="flex-1 bg-background p-4">
      <Text className="text-foreground text-xl font-bold">Digest Detail</Text>
      <Text className="text-muted mt-2">ID: {id}</Text>
    </View>
  );
}
