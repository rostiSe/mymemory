import type { WikiAgentLog } from "@/features/wiki/types";
import { useWikiLogs } from "@/features/wiki/hooks/useWikiPages";
import { Button, Chip } from "heroui-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

const ALL_LEVELS: WikiAgentLog["level"][] = ["info", "warn", "error", "action"];

function levelChipColor(
  level: WikiAgentLog["level"],
): "default" | "warning" | "danger" | "accent" {
  if (level === "error") return "danger";
  if (level === "warn") return "warning";
  if (level === "action") return "accent";
  return "default";
}

function formatLogTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export type AgentLogViewerProps = {
  runId: string;
};

export function AgentLogViewer({ runId }: AgentLogViewerProps) {
  const [limit, setLimit] = useState(100);
  const [levels, setLevels] = useState(() => new Set<WikiAgentLog["level"]>(ALL_LEVELS));

  const { data: logs = [], isPending } = useWikiLogs(runId, limit, true);

  const toggleLevel = useCallback((lvl: WikiAgentLog["level"]) => {
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  }, []);

  const filtered = useMemo(
    () => logs.filter((row) => levels.has(row.level)),
    [logs, levels],
  );

  return (
    <View>
      <Text className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
        Filter by level
      </Text>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {ALL_LEVELS.map((lvl) => (
          <Pressable
            key={lvl}
            onPress={() => toggleLevel(lvl)}
            accessibilityRole="button"
            accessibilityState={{ selected: levels.has(lvl) }}
            accessibilityLabel={`Toggle ${lvl} logs`}
          >
            <Chip
              size="sm"
              variant={levels.has(lvl) ? "soft" : "secondary"}
              color="default"
            >
              <Chip.Label className="text-xs">{lvl}</Chip.Label>
            </Chip>
          </Pressable>
        ))}
      </View>

      {isPending ? (
        <ActivityIndicator className="py-4" />
      ) : filtered.length === 0 ? (
        <Text className="text-muted py-4 text-sm">No log lines for this filter.</Text>
      ) : (
        <View>
          {filtered.map((item) => (
            <View
              key={item.id}
              className="mb-2 rounded-md border border-border bg-background px-3 py-2"
            >
              <View className="mb-1 flex-row flex-wrap items-center gap-2">
                <Text className="text-muted text-xs font-mono">
                  {formatLogTime(item.createdAt)}
                </Text>
                <Chip size="sm" variant="soft" color={levelChipColor(item.level)}>
                  <Chip.Label className="text-xs">{item.level}</Chip.Label>
                </Chip>
                {item.toolName ? (
                  <Chip size="sm" variant="secondary" color="default">
                    <Chip.Label className="text-xs" numberOfLines={1}>
                      {item.toolName}
                    </Chip.Label>
                  </Chip>
                ) : null}
              </View>
              <Text className="text-foreground text-sm leading-relaxed" selectable>
                {item.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {limit < 500 ? (
        <Button
          variant="ghost"
          className="mt-2"
          onPress={() => setLimit((n) => Math.min(n + 100, 500))}
        >
          Load more (up to 500)
        </Button>
      ) : null}
    </View>
  );
}
