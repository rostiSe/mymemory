import { View } from "react-native";
import { Button } from "heroui-native";

/**
 * TODO: wire reviewed state + server mutation when API exists.
 */
export function EntryReviewedAction() {
  return (
    <View className="mb-6 w-full">
      <Button
        variant="primary"
        className="w-full"
        onPress={() => {
          /* TODO */
        }}
      >
        Mark as reviewed
      </Button>
    </View>
  );
}
