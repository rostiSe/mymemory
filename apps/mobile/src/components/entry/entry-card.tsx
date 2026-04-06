import { View, Text } from 'react-native';
import { Card, Button } from 'heroui-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColor } from 'heroui-native';

interface EntryCardProps {
  title?: string;
  summary?: string;
  type?: 'url' | 'note';
  date?: string;
  onPress?: () => void;
}

export function EntryCard({ title, summary, type = 'url', date, onPress }: EntryCardProps) {
  const mutedColor = useThemeColor('muted');

  return (
    <Card className="mb-4">
      <Card.Body className="gap-2 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <MaterialIcons 
              name={type === 'url' ? 'link' : 'note'} 
              size={20} 
              color={mutedColor} 
            />
            <Text className="text-foreground font-bold text-lg flex-1" numberOfLines={1}>
              {title || 'Untitled Memory'}
            </Text>
          </View>
          {date && <Text className="text-muted text-xs">{date}</Text>}
        </View>

        <Text className="text-muted text-sm" numberOfLines={3}>
          {summary || 'No summary available.'}
        </Text>

        <View className="flex-row justify-end mt-2">
          <Button size="sm" variant="ghost" onPress={onPress}>
            View Details
          </Button>
        </View>
      </Card.Body>
    </Card>
  );
}
