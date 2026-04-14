import { AnimatedExpandSection } from "@/features/wiki/components/animation/AnimatedExpandSection";
import { AgentLogViewer } from "@/features/wiki/components/AgentLogViewer";
import { compileStatusCardVariants } from "@/features/wiki/components/CompileStatusCard/index.styles";
import { LintResultsSheet } from "@/features/wiki/components/LintResultsSheet";
import {
  summarizeWikiCompileResult,
  useCompileWiki,
} from "@/features/wiki/hooks/useWikiMutations";
import { useCompilationStatus } from "@/features/wiki/hooks/useWikiPages";
import type { WikiCompileResult } from "@/features/wiki/types";
import { useAppToast } from "@/hooks/useAppToast";
import { Button, Dialog } from "heroui-native";
import { useEffect, useMemo, useRef, useState } from "react";
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

  const tone = useMemo(() => {
    if (flashResult) return "success" as const;
    if (isCompiling) return "accent" as const;
    if (isFailed) return "danger" as const;
    if (hasCompiledBefore) return "success" as const;
    return "neutral" as const;
  }, [flashResult, hasCompiledBefore, isCompiling, isFailed]);

  const cardClass = compileStatusCardVariants({ tone });

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

  return (
    <View className={cardClass}>
      {flashResult && summary ? (
        <>
          <Text className="text-foreground text-base font-semibold">
            Wiki compiled successfully
          </Text>
          <Text className="text-foreground mt-2 text-sm leading-relaxed">
            Created: {summary.createdCount} pages · Updated: {summary.updatedCount} pages
          </Text>
          <Text className="text-muted mt-1 text-sm">
            Spaces processed: {summary.spacesProcessed} · Tokens: {summary.tokensLabel} (
            {summary.costLabel})
          </Text>
          {summary.orchestratorError ? (
            <Text className="mt-2 text-sm text-foreground/90" selectable>
              {summary.orchestratorError}
            </Text>
          ) : null}
          <AnimatedExpandSection title="View agent log" defaultExpanded={false}>
            <AgentLogViewer runId={flashResult.runId} />
          </AnimatedExpandSection>
          <Button
            variant="ghost"
            className="mt-2"
            onPress={() => setFlashResult(null)}
          >
            Dismiss summary
          </Button>
        </>
      ) : isCompiling ? (
        <>
          <View className="flex-row items-center gap-2">
            <ActivityIndicator />
            <Text className="text-foreground flex-1 text-base font-semibold">
              Compiling your wiki…
            </Text>
          </View>
          <Text className="text-muted mt-2 text-sm">
            Elapsed {elapsedSec}s — you can leave this screen; status updates every few
            seconds.
          </Text>
        </>
      ) : isFailed ? (
        <>
          <Text className="text-foreground text-base font-semibold">
            Compilation failed
          </Text>
          <Text className="text-muted mt-2 text-sm leading-relaxed">
            The last run did not finish cleanly. Try again, or run a health check for
            issues.
          </Text>
          {compile.error ? (
            <Text className="text-danger mt-2 text-sm" selectable>
              {compile.error instanceof Error
                ? compile.error.message
                : "Request failed"}
            </Text>
          ) : null}
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Button variant="primary" onPress={onPressRetry} isDisabled={compile.isPending}>
              Retry
            </Button>
            <Button variant="ghost" onPress={() => setLintOpen(true)}>
              Health check
            </Button>
          </View>
        </>
      ) : hasCompiledBefore ? (
        <>
          <Text className="text-foreground text-base font-semibold">Wiki</Text>
          {lastCompiledLabel ? (
            <Text className="text-muted mt-1 text-sm">Last compiled: {lastCompiledLabel}</Text>
          ) : null}
          <Text className="text-muted mt-2 text-sm leading-relaxed">
            Update pages for new entries, or run a full recompile to refresh everything.
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Button
              variant="primary"
              onPress={onPressIncremental}
              isDisabled={compile.isPending}
            >
              Update wiki
            </Button>
            <Button
              variant="secondary"
              onPress={() => setFullDialogOpen(true)}
              isDisabled={compile.isPending}
            >
              Full recompile
            </Button>
            <Button variant="ghost" onPress={() => setLintOpen(true)}>
              Health check
            </Button>
          </View>
        </>
      ) : (
        <>
          <Text className="text-foreground text-base font-semibold">Wiki</Text>
          <Text className="text-muted mt-2 text-sm leading-relaxed">
            Your wiki has not been compiled yet. Generate pages from your spaces and
            entries.
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Button
              variant="primary"
              onPress={onPressCompileFirst}
              isDisabled={compile.isPending}
            >
              Compile wiki
            </Button>
            <Button variant="ghost" onPress={() => setLintOpen(true)}>
              Health check
            </Button>
          </View>
        </>
      )}

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
              <Button
                variant="ghost"
                className="flex-1"
                onPress={() => setFullDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onPress={() => {
                  setFullDialogOpen(false);
                  requestCompile("full");
                }}
              >
                Continue
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}
