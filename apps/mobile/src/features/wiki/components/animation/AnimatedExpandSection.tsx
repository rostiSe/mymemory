import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { useCallback, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

export type AnimatedExpandSectionProps = {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
};

export function AnimatedExpandSection({
  title,
  children,
  defaultExpanded = true,
}: AnimatedExpandSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const muted = useThemeColor("muted");

  const toggle = useCallback(() => {
    setExpanded((e) => !e);
  }, []);

  return (
    <Animated.View className="mb-4" layout={LinearTransition.springify()}>
      <Pressable
        onPress={toggle}
        className="flex-row items-center justify-between rounded-lg border border-border bg-surface-secondary px-card py-3"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text className="text-foreground flex-1 pr-2 font-semibold" selectable>
          {title}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={muted}
        />
      </Pressable>
      {expanded ? (
        <Animated.View className="mt-2" layout={LinearTransition.springify()}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
