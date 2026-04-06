import { Pressable, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "heroui-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

/**
 * Custom floating pill-shaped tab bar.
 *
 * Design reference: Stitch bottom nav — centered, rounded-full,
 * semi-transparent surface with shadow, floating above bottom edge.
 *
 * Usage: Pass as `tabBar` prop to `<Tabs>` from expo-router.
 *
 * @example
 * ```tsx
 * import { FloatingTabBar } from "@/components/floating-tab-bar";
 * <Tabs tabBar={(props) => <FloatingTabBar {...props} />}>
 * ```
 */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const accentColor = useThemeColor("accent");
  const mutedColor = useThemeColor("muted");

  const bottomOffset = Math.max(insets.bottom, 12) + 12;

  return (
    <View
      style={{ bottom: bottomOffset }}
      className="absolute left-5 right-5 mx-auto max-w-md flex-row items-center justify-around rounded-full border border-border bg-surface px-2 py-2"
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        const iconName = getIconName(route.name);

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            className={`items-center justify-center rounded-full p-3 ${
              isFocused ? "bg-accent" : ""
            }`}
          >
            <MaterialIcons
              name={iconName}
              size={24}
              color={isFocused ? "#FFFFFF" : mutedColor}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function getIconName(
  routeName: string
): React.ComponentProps<typeof MaterialIcons>["name"] {
  switch (routeName) {
    case "index":
      return "home";
    case "search":
      return "search";
    case "spaces":
      return "folder";
    case "digestion":
      return "auto-awesome";
    case "settings":
      return "settings";
    default:
      return "circle";
  }
}
