import { useState } from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import { Button, Card } from 'heroui-native';
import { useAppStore } from '@/stores/providers/app-provider';
import { Stack } from 'expo-router';
import { useAppToast } from '@/hooks/useAppToast';
import { orpc } from '@/lib/orpc';
import { useMutation } from '@tanstack/react-query';

export default function TemplateTestScreen() {
  const toast = useAppToast();
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const setIsOnboarded = useAppStore((s) => s.setIsOnboarded);

  // Form State
  const [url, setUrl] = useState('https://jina.ai');

  const { mutate, isPending, data: aiResult } = useMutation(
    orpc.ai.ingest.mutationOptions({
      onSuccess: () => {
        toast.success('Pipeline Complete!', 'Content successfully processed through all AI stages.');
      },
      onError: (error: Error) => {
        toast.error('AI Pipeline Failed', error.message || 'Server error');
      }
    })
  );

  const runAIPipeline = () => {
    if (!url) {
      toast.warning('Input Required', 'Please provide a URL to ingest');
      return;
    }
    mutate({ url });
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

          <View className="mb-2">
            <Text className="text-foreground font-medium mb-1">URL to Ingest</Text>
            <TextInput
              className="bg-surface-secondary border border-border rounded-lg p-3 text-foreground"
              placeholder="https://..."
              placeholderTextColor="#888"
              value={url}
              onChangeText={setUrl}
              editable={!isPending}
            />
          </View>

          <Button 
            onPress={runAIPipeline} 
            isDisabled={isPending}
            variant="primary"
          >
            {isPending ? 'Running AI Pipeline...' : 'Run Pipeline'}
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
                  {'\n'}Preview: [{aiResult.embeddingPreview?.map((n: number) => n.toFixed(3)).join(', ')}, ...]
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
