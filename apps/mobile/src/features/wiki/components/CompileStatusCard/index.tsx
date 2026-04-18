import { Button } from "@/components/ui/Button/index";
import { StatusCard } from "@/components/ui/Card/variants/StatusCard/index";
import { AnimatedExpandSection } from "@/features/wiki/components/animation/AnimatedExpandSection";
import { AgentLogViewer } from "@/features/wiki/components/AgentLogViewer";
import { LintResultsSheet } from "@/features/wiki/components/LintResultsSheet";
import {
  summarizeWikiCompileResult,
  useCompileWiki,
} from "@/features/wiki/hooks/useWikiMutations";
import { useCompilationStatus } from "@/features/wiki/hooks/useWikiPages";
import type { WikiCompileResult } from "@/features/wiki/types";
import { useAppToast } from "@/hooks/useAppToast";
import { Dialog } from "heroui-native";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

function formatLastCompiled(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function CompileStatusCard() {
  const toast = useAppToast();
  const { data: compileStatus } = useCompilationStatus();
  const compile = useCompileWiki();

  const [flashResult, setFlashResult] = useState<WikiCompileResult | null>(null);
  const [lintOpen, setLintOpen] = useState(false);
  const [fullDialogOpen, setFullDialogOpen] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const lastModeRef = useRef<"full" | "incremental">("full");
  const compilingSinceRef = useRef<number | null>(null);

  const isCompiling =
    compile.isPending || compileStatus?.status === "compiling";
  const isFailed =
    !isCompiling && compileStatus?.status === "failed" && flashResult === null;
  const hasCompiledBefore = Boolean(compileStatus?.lastCompiledAt);
  const lastCompiledLabel = formatLastCompiled(compileStatus?.lastCompiledAt);

  useEffect(() => {
    if (!isCompiling) {
      compilingSinceRef.current = null;
      setElapsedSec(0);
      return;
    }
    if (compilingSinceRef.current === null) {
      compilingSinceRef.current = Date.now();
    }
    const tick = () => {
      const start = compilingSinceRef.current ?? Date.now();
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isCompiling]);

  useEffect(() => {
    if (!flashResult) return;
    const id = setTimeout(() => setFlashResult(null), 8000);
    return () => clearTimeout(id);
  }, [flashResult]);

  const requestCompile = (mode: "full" | "incremental") => {
    lastModeRef.current = mode;
    compile.mutate(
      { mode },
      {
        onSuccess: (data) => {
          setFlashResult(data);
          const summary = summarizeWikiCompileResult(data);
          const detail = `${summary.createdCount} created · ${summary.updatedCount} updated · ${summary.tokensLabel} tokens (${summary.costLabel})`;
          if (data.error) {
            toast.warning("Wiki compiled with warnings", `${detail}\n${data.error}`);
          } else {
            toast.success("Wiki compiled", detail);
          }
        },
        onError: (err) => {
          toast.error(
            "Compile failed",
            err instanceof Error ? err.message : "Request failed",
          );
        },
      },
    );
  };

  const onPressCompileFirst = () => requestCompile("full");
  const onPressIncremental = () => requestCompile("incremental");
  const onPressRetry = () => requestCompile(lastModeRef.current);

  const summary = flashResult ? summarizeWikiCompileResult(flashResult) : null;

  const failedDescription = useMemo(() => {
    const errText = compile.error
      ? compile.error instanceof Error
        ? compile.error.message
        : "Request failed"
      : null;
    return (
      <View className="gap-2">
        <Text className="text-muted text-sm leading-relaxed">
          The last run did not finish cleanly. Try again, or run a health check for
          issues.
        </Text>
        {errText ? (
          <Text className="text-danger text-sm" selectable>
            {errText}
          </Text>
        ) : null}
      </View>
    );
  }, [compile.error]);

  let panel: ReactNode;
  if (flashResult && summary) {
    panel = (
      <StatusCard
        tone="success"
        title="Wiki compiled successfully"
        description={
          <View className="mt-2 gap-2">
            <Text className="text-foreground text-sm leading-relaxed">
              Created: {summary.createdCount} pages · Updated: {summary.updatedCount}{" "}
              pages
            </Text>
            <Text className="text-muted text-sm">
              Spaces processed: {summary.spacesProcessed} · Tokens:{" "}
              {summary.tokensLabel} ({summary.costLabel})
            </Text>
            {summary.orchestratorError ? (
              <Text className="text-sm text-foreground/90" selectable>
                {summary.orchestratorError}
              </Text>
            ) : null}
          </View>
        }
        meta={
          <AnimatedExpandSection title="View agent log" defaultExpanded={false}>
            <AgentLogViewer runId={flashResult.runId} />
          </AnimatedExpandSection>
        }
        action={
          <Button tone="ghost" onPress={() => setFlashResult(null)}>
            Dismiss summary
          </Button>
        }
      />
    );
  } else if (isCompiling) {
    panel = (
      <StatusCard
        tone="accent"
        description={
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <ActivityIndicator />
              <Text className="text-foreground flex-1 text-base font-semibold">
                Compiling your wiki…
              </Text>
            </View>
            <Text className="text-muted text-sm">
              Elapsed {elapsedSec}s — you can leave this screen; status updates every few
              seconds.
            </Text>
          </View>
        }
      />
    );
  } else if (isFailed) {
    panel = (
      <StatusCard
        tone="danger"
        title="Compilation failed"
        description={failedDescription}
        action={
          <View className="flex-row flex-wrap gap-2">
            <Button
              tone="primary"
              onPress={onPressRetry}
              isDisabled={compile.isPending}
            >
              Retry
            </Button>
            <Button tone="ghost" onPress={() => setLintOpen(true)}>
              Health check
            </Button>
          </View>
        }
      />
    );
  } else if (hasCompiledBefore) {
    panel = (
      <StatusCard
        tone="success"
        title="Wiki"
        description={
          <View className="gap-2">
            {lastCompiledLabel ? (
              <Text className="text-muted text-sm">Last compiled: {lastCompiledLabel}</Text>
            ) : null}
            <Text className="text-muted text-sm leading-relaxed">
              Update pages for new entries, or run a full recompile to refresh everything.
            </Text>
          </View>
        }
        action={
          <View className="flex-row flex-wrap gap-2">
            <Button
              tone="primary"
              onPress={onPressIncremental}
              loading={compile.isPending}
              isDisabled={compile.isPending}
            >
              Update wiki
            </Button>
            <Button
              tone="secondary"
              onPress={() => setFullDialogOpen(true)}
              isDisabled={compile.isPending}
            >
              Full recompile
            </Button>
            <Button tone="ghost" onPress={() => setLintOpen(true)}>
              Health check
            </Button>
          </View>
        }
      />
    );
  } else {
    panel = (
      <StatusCard
        tone="neutral"
        title="Wiki"
        description="Your wiki has not been compiled yet. Generate pages from your spaces and entries."
        action={
          <View className="flex-row flex-wrap gap-2">
            <Button
              tone="primary"
              onPress={onPressCompileFirst}
              loading={compile.isPending}
              isDisabled={compile.isPending}
            >
              Compile wiki
            </Button>
            <Button tone="ghost" onPress={() => setLintOpen(true)}>
              Health check
            </Button>
          </View>
        }
      />
    );
  }

  return (
    <View>
      {panel}
      <LintResultsSheet open={lintOpen} onOpenChange={setLintOpen} />

      <Dialog isOpen={fullDialogOpen} onOpenChange={setFullDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Close variant="ghost" />
            <Dialog.Title>Full recompile?</Dialog.Title>
            <Dialog.Description>
              This rebuilds wiki pages from your current spaces and entries. Existing
              pages are updated in place; nothing is deleted automatically.
            </Dialog.Description>
            <View className="mt-4 flex-row gap-2">
              <View className="flex-1">
                <Button tone="ghost" fullWidth onPress={() => setFullDialogOpen(false)}>
                  Cancel
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  tone="primary"
                  fullWidth
                  onPress={() => {
                    setFullDialogOpen(false);
                    requestCompile("full");
                  }}
                >
                  Continue
                </Button>
              </View>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}
