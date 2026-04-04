import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Link, router } from "expo-router";
import {
  Button,
  Card,
  TextField,
  Input,
  Label,
  FieldError,
} from "heroui-native";
import { useAuthStore } from "@/stores/providers/auth-provider";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await signUp(email, password);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed.");
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
          <Card.Description>Create a new account</Card.Description>
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
              placeholder="Choose a password"
              secureTextEntry
              autoComplete="new-password"
            />
          </TextField>

          <TextField isInvalid={!!error}>
            <Label>Confirm Password</Label>
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              autoComplete="new-password"
            />
            <FieldError>{error}</FieldError>
          </TextField>
        </Card.Body>

        <Card.Footer className="flex-col gap-3">
          <Button
            variant="primary"
            className="w-full"
            onPress={handleSignUp}
            isDisabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>

          <View className="flex-row items-center justify-center gap-1">
            <Link href="/(auth)/login" className="text-primary-500">
              Already have an account? Sign in
            </Link>
          </View>
        </Card.Footer>
      </Card>
    </KeyboardAvoidingView>
  );
}
