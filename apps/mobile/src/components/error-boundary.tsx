import { Component, type ErrorInfo, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Button } from "heroui-native";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
          <Text className="text-xl font-bold text-foreground">
            Something went wrong
          </Text>
          <Text className="text-center text-sm text-muted">
            The app encountered an unexpected error. Please try again.
          </Text>
          {__DEV__ && this.state.error && (
            <View className="w-full rounded-lg bg-danger/10 p-4">
              <Text className="font-mono text-xs text-danger">
                {this.state.error.message}
              </Text>
            </View>
          )}
          <Button variant="primary" onPress={this.handleRetry}>
            Try Again
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}
