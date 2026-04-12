import { Button, Dialog } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

export default function DialogExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <Button variant="primary">Open Dialog</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Close variant="ghost" />
          <View className="mb-5 gap-1.5">
            <Dialog.Title>Confirm Action</Dialog.Title>
            <Dialog.Description>
              Are you sure you want to proceed with this action? This cannot be
              undone.
            </Dialog.Description>
          </View>
          <View className="flex-row justify-end gap-3">
            <Button variant="ghost" size="sm" onPress={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm">Confirm</Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
