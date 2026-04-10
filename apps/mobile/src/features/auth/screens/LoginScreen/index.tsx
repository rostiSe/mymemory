import { useAppToast } from "@/hooks/useAppToast";
import { useAuthStore } from "@/stores/providers/auth-provider";
import { Link, router } from "expo-router";
import {
  Button,
  Card,
  FieldError,
  Input,
  Label,
  TextField,
} from "heroui-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);
  const toast = useAppToast();

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign in failed.";
      setError(message);
      toast.error("Sign in failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 justify-center bg-background px-6"
    >
      <Card>
        <Card.Header className="items-center pb-2">
          <Card.Title className="text-2xl font-bold">MyMemory</Card.Title>
          <Card.Description>Sign in to your account</Card.Description>
        </Card.Header>

        <Card.Body className="gap-4">
          <TextField isInvalid={!!error}>
            <Label>Email</Label>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </TextField>

          <TextField isInvalid={!!error}>
            <Label>Password</Label>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              autoComplete="password"
            />
            <FieldError>{error}</FieldError>
          </TextField>
        </Card.Body>

        <Card.Footer className="flex-col gap-3 py-2">
          <Button
            variant="primary"
            className="w-full"
            onPress={handleSignIn}
            isDisabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <View className="flex-row items-center justify-center gap-1">
            <Link href="/(auth)/signup" className="text-accent">
              Don&apos;t have an account? Sign up
            </Link>
          </View>
        </Card.Footer>
      </Card>
    </KeyboardAvoidingView>
  );
}
