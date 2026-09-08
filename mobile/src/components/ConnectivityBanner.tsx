import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsOnline } from "../hooks/use-network";
import { colors } from "../theme/colors";

/**
 * Bannière affichée quand la connexion est interrompue : les données
 * consultées restent accessibles depuis le cache local et seront
 * re-synchronisées automatiquement au retour du réseau.
 */
export function ConnectivityBanner() {
  const online = useIsOnline();
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: online ? -60 : 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [online, translateY]);

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]} pointerEvents="none">
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.text}>Hors ligne — affichage des données en cache</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#b45309",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  text: { color: "#fff", fontSize: 12.5, fontWeight: "600" },
});
