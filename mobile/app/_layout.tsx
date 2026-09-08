import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { convex } from "../src/api/convex";
import { secureTokenStorage } from "../src/auth/secure-storage";
import { useAuth } from "../src/hooks/use-auth";
import { ConnectivityBanner } from "../src/components/ConnectivityBanner";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <>
      <ConnectivityBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name={isAuthenticated ? "(tabs)" : "(auth)"} />
        <Stack.Screen name="estimation/new" />
        <Stack.Screen name="estimation/[id]" />
        <Stack.Screen name="location/new" />
        <Stack.Screen name="location/[id]" />
        <Stack.Screen name="historique" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexAuthProvider client={convex} storage={secureTokenStorage}>
        <StatusBar style="auto" />
        <RootNavigator />
      </ConvexAuthProvider>
    </GestureHandlerRootView>
  );
}
