import { Button } from "heroui-native";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-red-500">
        Edit src/app/index.tsx to edit this screen.
      </Text>
      <Button variant="primary" onPress={() => alert("Button pressed")}>
        Click me
      </Button>
    </View>
  );
}
