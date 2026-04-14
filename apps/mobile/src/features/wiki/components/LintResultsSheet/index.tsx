import { useLintWiki } from "@/features/wiki/hooks/useWikiMutations";
import type { WikiLintResult } from "@/features/wiki/types";
import { useAppToast } from "@/hooks/useAppToast";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { Button, Chip } from "heroui-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type LintResultsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function severityChipColor(
  severity: WikiLintResult["issues"][number]["severity"],
): "default" | "warning" | "danger" {
  if (severity === "error") return "danger";
  if (severity === "warn") return "warning";
  return "default";
}

function formatRunTime(d: Date) {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function LintResultsSheet({ open, onOpenChange }: LintResultsSheetProps) {
  const insets = useSafeAreaInsets();
  const muted = useThemeColor("muted");
  const accent = useThemeColor("accent");
  const dangerColor = useThemeColor("danger");
  const warningColor = useThemeColor("warning");
  const toast = useAppToast();
  const lint = useLintWiki();
  const [finishedAt, setFinishedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!open) {
      lint.reset();
      setFinishedAt(null);
      return;
    }
    lint.mutate(undefined, {
      onSuccess: (result) => {
        setFinishedAt(new Date());
        const n = result.issues.length;
        if (n === 0) {
          toast.info("Health check", "No issues found.");
        } else {
          toast.info("Health check", `${n} issue${n === 1 ? "" : "s"} found.`);
        }
      },
    });
    // Intentionally only re-run when `open` changes; `lint` is a stable mutation API.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [open]);

  const data = lint.data;
  const issueCount = data?.issues.length ?? 0;

  const listEmpty = useMemo(() => {
    if (lint.isPending || lint.isError) return null;
    if (!data || issueCount > 0) return null;
    return (
      <View className="items-center py-8 px-4">
        <MaterialIcons name="check-circle" size={40} color={accent} />
        <Text className="text-foreground mt-3 text-center text-base font-semibold">
          No issues found
        </Text>
        <Text className="text-muted mt-1 text-center text-sm">
          Your wiki looks healthy.
        </Text>
      </View>
    );
  }, [accent, data, issueCount, lint.isError, lint.isPending]);

  const renderIssue = useCallback(
    ({ item }: { item: WikiLintResult["issues"][number] }) => (
      <View className="mb-3 rounded-lg border border-border bg-surface-secondary px-card py-3">
        <View className="mb-2 flex-row flex-wrap items-center gap-2">
          <MaterialIcons
            name={
              item.severity === "error"
                ? "error-outline"
                : item.severity === "warn"
                  ? "warning"
                  : "info-outline"
            }
            size={20}
            color={
              item.severity === "error"
                ? dangerColor
                : item.severity === "warn"
                  ? warningColor
                  : muted
            }
          />
          <Chip size="sm" variant="soft" color={severityChipColor(item.severity)}>
            <Chip.Label className="text-xs">{item.category}</Chip.Label>
          </Chip>
        </View>
        <Text className="text-foreground text-sm leading-relaxed" selectable>
          {item.message}
        </Text>
        {item.suggestedFix ? (
          <Text
            className="text-muted mt-2 text-sm italic leading-relaxed"
            selectable
          >
            {item.suggestedFix}
          </Text>
        ) : null}
      </View>
    ),
    [dangerColor, muted, warningColor],
  );

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={() => onOpenChange(false)}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Pressable
          className="max-h-[88%] rounded-t-2xl border-t border-border bg-surface px-screen pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="text-foreground text-lg font-semibold">Wiki health check</Text>
          <Text className="text-muted mt-1 text-sm">
            {lint.isPending
              ? "Running linter…"
              : data
                ? `${issueCount} issue${issueCount === 1 ? "" : "s"} · ~${data.totalTokens} tokens`
                : ""}
          </Text>

          {lint.isPending ? (
            <ActivityIndicator className="py-10" />
          ) : lint.isError ? (
            <Text className="text-danger mt-4 text-sm">
              Could not complete health check.
            </Text>
          ) : (
            <FlatList
              className="mt-4"
              data={data?.issues ?? []}
              keyExtractor={(_item, index) => `lint-${index}`}
              renderItem={renderIssue}
              ListEmptyComponent={listEmpty}
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          )}

          {data && finishedAt ? (
            <Text className="text-muted mt-2 text-xs">Run at {formatRunTime(finishedAt)}</Text>
          ) : null}

          <Button
            variant="primary"
            className="mt-4"
            onPress={() => onOpenChange(false)}
          >
            Close
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
