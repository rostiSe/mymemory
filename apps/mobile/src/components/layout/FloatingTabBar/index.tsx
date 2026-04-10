import { Pressable, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "heroui-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  ICON_SIZE_TAB_PX,
  LAYOUT_FLOATING_TAB_ABOVE_PILL_GAP_PX,
  LAYOUT_FLOATING_TAB_HORIZONTAL_MARGIN_PX,
  LAYOUT_FLOATING_TAB_MIN_BOTTOM_FALLBACK_PX,
} from "@/theme/layout-imperative";

/**
 * Custom floating pill-shaped tab bar.
 *
 * Pass as `tabBar` prop to `<Tabs>` from expo-router.
 * Layout numbers mirror `global.css` (--layout-*, --icon-size-tab).
 */
export default function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const mutedColor = useThemeColor("muted");
  const accentForeground = useThemeColor("accent-foreground");

  const bottomOffset =
    Math.max(insets.bottom, LAYOUT_FLOATING_TAB_MIN_BOTTOM_FALLBACK_PX) +
    LAYOUT_FLOATING_TAB_ABOVE_PILL_GAP_PX;

  return (
    <View
      style={{
        bottom: bottomOffset,
        left: LAYOUT_FLOATING_TAB_HORIZONTAL_MARGIN_PX,
        right: LAYOUT_FLOATING_TAB_HORIZONTAL_MARGIN_PX,
      }}
      className="absolute flex-row items-center justify-around rounded-full border border-border bg-surface px-2 py-2"
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
              size={ICON_SIZE_TAB_PX}
              color={isFocused ? accentForeground : mutedColor}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function getIconName(
  routeName: string,
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
