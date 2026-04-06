import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button, Card, TextField, Input, Label } from 'heroui-native';
import { useAppStore } from '@/stores/providers/app-provider';
import { Stack } from 'expo-router';
import { useAppToast } from '@/hooks/useAppToast';
import Constants from 'expo-constants';

export default function TemplateTestScreen() {
  const toast = useAppToast();
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const setIsOnboarded = useAppStore((s) => s.setIsOnboarded);

  // Form State
  const [url, setUrl] = useState('https://jina.ai');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    extractedText?: string;
    summary?: string;
    embeddingPreview?: number[];
    embeddingLength?: number;
  } | null>(null);

  const runAIPipeline = async () => {
    if (!url) {
      toast.warning('Input Required', 'Please provide a URL to ingest');
      return;
    }

    setIsLoading(true);
    setAiResult(null);

    try {
      // Determine the API base URL depending on dev/prod environment
      // Expo API routes run locally alongside the bundler
      const hostUri = Constants?.expoConfig?.hostUri;
      const baseUrl = hostUri ? `http://${hostUri}` : 'http://localhost:8081';
      
      const res = await fetch(`${baseUrl}/api/ai/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server error');
      }

      setAiResult(data);
      toast.success('Pipeline Complete!', 'Content successfully processed through all AI stages.');
    } catch (error: any) {
      toast.error('AI Pipeline Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Stack.Screen options={{ title: 'Template Showcase' }} />

      <Text className="text-foreground text-2xl font-bold">Tech Stack Showcase</Text>

      <Card>
        <Card.Body className="gap-4">
          <View>
            <Text className="text-foreground font-bold text-lg">1. Zustand + MMKV Persistence</Text>
            <Text className="text-muted text-sm">
              This global store state persists synchronously via MMKV. Reload the app and the toggle state will stay exactly the same.
            </Text>
          </View>
          <View className="flex-row items-center justify-between p-3 bg-surface-secondary rounded-lg">
            <Text className="text-foreground">App is onboarded?</Text>
            <Button
              size="sm"
              variant={isOnboarded ? 'primary' : 'outline'}
              onPress={() => setIsOnboarded(!isOnboarded)}
            >
              {isOnboarded ? 'Yes (Toggle)' : 'No (Toggle)'}
            </Button>
          </View>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="gap-4">
          <View>
            <Text className="text-foreground font-bold text-lg">2. AI Ingest Pipeline</Text>
            <Text className="text-muted text-sm">
              Tests Expo API Routes by chaining Jina URL extraction, OpenAI summarization, and OpenAI embeddings in a single request.
            </Text>
          </View>

          <TextField isDisabled={isLoading}>
            <Label>URL to Ingest</Label>
            <Input
              placeholder="https://..."
              value={url}
              onChangeText={setUrl}
            />
          </TextField>

          <Button 
            onPress={runAIPipeline} 
            isDisabled={isLoading}
            variant="primary"
          >
            {isLoading ? 'Running AI Pipeline...' : 'Run Pipeline'}
          </Button>

          {aiResult && (
            <View className="gap-3 mt-4">
              <View className="bg-surface-secondary p-3 rounded-lg border border-border">
                <Text className="text-foreground font-bold mb-1 text-sm">Extracted Text (via Jina ReaderLM v2)</Text>
                <Text className="text-muted text-xs" numberOfLines={4}>{aiResult.extractedText}</Text>
              </View>

              <View className="bg-surface-secondary p-3 rounded-lg border border-border">
                <Text className="text-foreground font-bold mb-1 text-sm">Summary (via gpt-4o-mini)</Text>
                <Text className="text-muted text-sm leading-5">{aiResult.summary}</Text>
              </View>

              <View className="bg-surface-secondary p-3 rounded-lg border border-border">
                <Text className="text-foreground font-bold mb-1 text-sm">Embedding (via text-embedding-3-small)</Text>
                <Text className="text-muted text-xs font-mono">
                  Vector Length: {aiResult.embeddingLength}
                  {'\n'}Preview: [{aiResult.embeddingPreview?.map(n => n.toFixed(3)).join(', ')}, ...]
                </Text>
              </View>
            </View>
          )}
        </Card.Body>
      </Card>
      
      {/* Spacer for bottom tab bar */}
      <View className="h-20" />
    </ScrollView>
  );
}
