import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useErrorStore } from '@/store/error-store';

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    useErrorStore.getState().setError({
      message: error.message || 'Something went wrong.',
      raw: errorInfo.componentStack,
    });
  }

  reset = () => {
    this.setState({ hasError: false });
    useErrorStore.getState().clearError();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>HopIn hit an unexpected error.</Text>
          <Text style={styles.body}>
            Restart this view and try again. The error was also sent to the
            global error state for logging hooks.
          </Text>
          <Pressable accessibilityRole="button" onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: '#F7FAFF',
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B4FE8',
    paddingHorizontal: 18,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
