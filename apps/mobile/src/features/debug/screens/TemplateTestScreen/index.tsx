import { Button } from "@/components/ui/Button/index";
import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Card, TextField, Input, Label } from "heroui-native";
import { useAppStore } from "@/stores/providers/app-provider";
import { Stack } from "expo-router";
import { useAppToast } from "@/hooks/useAppToast";
import { orpcClient } from "@/lib/orpc";

export default function TemplateTestScreen() {
  const toast = useAppToast();
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const setIsOnboarded = useAppStore((s) => s.setIsOnboarded);

  const [url, setUrl] = useState("https://jina.ai");
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    extractedText?: string;
    summary?: string;
    embeddingPreview?: number[];
    embeddingLength?: number;
  } | null>(null);

  const runAIPipeline = async () => {
    if (!url) {
      toast.warning("Input Required", "Please provide a URL to ingest");
      return;
    }

    setIsLoading(true);
    setAiResult(null);

    try {
      const data = await orpcClient.ai.demo({ url });
      setAiResult(data);
      toast.success(
        "Pipeline Complete!",
        "Content successfully processed through all AI stages.",
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error("AI Pipeline Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <Stack.Screen options={{ title: "Template Showcase" }} />

      <Text className="text-foreground text-2xl font-bold">
        Tech Stack Showcase
      </Text>

      <Card>
        <Card.Body className="gap-4">
          <View>
            <Text className="text-foreground font-bold text-lg">
              1. Zustand + MMKV Persistence
            </Text>
            <Text className="text-muted text-sm">
              This global store state persists synchronously via MMKV. Reload the
              app and the toggle state will stay exactly the same.
            </Text>
          </View>
          <View className="flex-row items-center justify-between p-3 bg-surface-secondary rounded-lg">
            <Text className="text-foreground">App is onboarded?</Text>
            <Button
              size="sm"
              tone={isOnboarded ? "primary" : "secondary"}
              onPress={() => setIsOnboarded(!isOnboarded)}
            >
              {isOnboarded ? "Yes (Toggle)" : "No (Toggle)"}
            </Button>
          </View>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="gap-4">
          <View>
            <Text className="text-foreground font-bold text-lg">
              2. AI Ingest Pipeline
            </Text>
            <Text className="text-muted text-sm">
              Calls the Hono oRPC server (apps/server, port 8787 in dev) for
              Jina extraction, summarization, and embeddings.
            </Text>
          </View>

          <TextField isDisabled={isLoading}>
            <Label>URL to Ingest</Label>
            <Input placeholder="https://..." value={url} onChangeText={setUrl} />
          </TextField>

          <Button
            tone="primary"
            onPress={runAIPipeline}
            loading={isLoading}
            isDisabled={isLoading}
          >
            Run Pipeline
          </Button>

          {aiResult && (
            <View className="gap-3 mt-4">
              <View className="bg-surface-secondary p-3 rounded-lg border border-border">
                <Text className="text-foreground font-bold mb-1 text-sm">
                  Extracted Text (via Jina ReaderLM v2)
                </Text>
                <Text className="text-muted text-xs" numberOfLines={4}>
                  {aiResult.extractedText}
                </Text>
              </View>

              <View className="bg-surface-secondary p-3 rounded-lg border border-border">
                <Text className="text-foreground font-bold mb-1 text-sm">
                  Summary (via gpt-4o-mini)
                </Text>
                <Text className="text-muted text-sm leading-5">
                  {aiResult.summary}
                </Text>
              </View>

              <View className="bg-surface-secondary p-3 rounded-lg border border-border">
                <Text className="text-foreground font-bold mb-1 text-sm">
                  Embedding (via text-embedding-3-small)
                </Text>
                <Text className="text-muted text-xs font-mono">
                  Vector Length: {aiResult.embeddingLength}
                  {"\n"}Preview: [
                  {aiResult.embeddingPreview?.map((n) => n.toFixed(3)).join(", ")}
                  , ...]
                </Text>
              </View>
            </View>
          )}
        </Card.Body>
      </Card>

      <View className="h-20" />
    </ScrollView>
  );
}
