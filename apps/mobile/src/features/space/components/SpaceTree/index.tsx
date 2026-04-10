import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";

interface SpaceNode {
  id: string;
  name: string;
  children?: SpaceNode[];
}

interface SpaceTreeProps {
  spaces: SpaceNode[];
  onSpacePress?: (id: string) => void;
  level?: number;
}

export default function SpaceTree({
  spaces,
  onSpacePress,
  level = 0,
}: SpaceTreeProps) {
  const mutedColor = useThemeColor("muted");

  return (
    <View className="gap-2">
      {spaces.map((space) => (
        <View key={space.id} style={{ marginLeft: level * 16 }}>
          <Pressable
            onPress={() => onSpacePress?.(space.id)}
            className="flex-row items-center gap-2 py-2 px-3 bg-surface-secondary rounded-lg active:bg-surface-tertiary"
          >
            <MaterialIcons name="folder" size={20} color={mutedColor} />
            <Text className="text-foreground font-medium">{space.name}</Text>
          </Pressable>

          {space.children && space.children.length > 0 && (
            <View className="mt-2 border-l border-border ml-2 pl-2">
              <SpaceTree
                spaces={space.children}
                onSpacePress={onSpacePress}
                level={level + 1}
              />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
