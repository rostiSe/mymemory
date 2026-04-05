import { useToast } from "heroui-native";
import { useCallback } from "react";

export function useAppToast() {
  const { toast } = useToast();

  const success = useCallback(
    (label: string, description?: string) => {
      toast.show({ label, description, variant: "success" });
    },
    [toast]
  );

  const error = useCallback(
    (label: string, description?: string) => {
      toast.show({ label, description, variant: "danger" });
    },
    [toast]
  );

  const warning = useCallback(
    (label: string, description?: string) => {
      toast.show({ label, description, variant: "warning" });
    },
    [toast]
  );

  const info = useCallback(
    (label: string, description?: string) => {
      toast.show({ label, description, variant: "default" });
    },
    [toast]
  );

  return { success, error, warning, info };
}
