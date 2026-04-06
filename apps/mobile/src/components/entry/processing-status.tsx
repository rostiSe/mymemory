import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ProcessingStatusProps {
  status: 'pending' | 'processing' | 'done' | 'failed';
  error?: string | null;
}

export function ProcessingStatus({ status, error }: ProcessingStatusProps) {
  if (status === 'done') return null; // Or show a tiny green check

  let iconName: React.ComponentProps<typeof MaterialIcons>["name"] = 'schedule';
  let colorClass = 'text-muted';
  let text = 'Pending...';
  let bgClass = 'bg-surface-secondary';

  if (status === 'processing') {
    iconName = 'sync';
    colorClass = 'text-accent';
    text = 'AI is analyzing this memory...';
    bgClass = 'bg-accent/10';
  } else if (status === 'failed') {
    iconName = 'error';
    colorClass = 'text-danger';
    text = `Processing Failed: ${error || 'Unknown error'}`;
    bgClass = 'bg-danger/10';
  }

  return (
    <View className={`flex-row items-center gap-2 p-3 rounded-lg ${bgClass}`}>
      <MaterialIcons name={iconName} size={18} className={colorClass} />
      <Text className={`${colorClass} flex-1 text-sm font-medium`}>{text}</Text>
    </View>
  );
}
