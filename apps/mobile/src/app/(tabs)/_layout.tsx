import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import { FloatingTabBar } from "@/components/floating-tab-bar";

export default function TabsLayout() {
  const backgroundColor = useThemeColor("background");
  const foregroundColor = useThemeColor("foreground");

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor },
        headerTintColor: foregroundColor,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
        }}
      />
      <Tabs.Screen
        name="spaces"
        options={{
          title: "Spaces",
        }}
      />
      <Tabs.Screen
        name="digestion"
        options={{
          title: "Digestion",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
      />
    </Tabs>
  );
}
