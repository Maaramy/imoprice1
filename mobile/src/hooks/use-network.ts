import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

const initialState: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  type: null,
};

/**
 * État de la connexion — pilote la bannière « hors ligne » et le
 * basculement du cache local.
 */
export function useNetwork(): NetworkState {
  const [state, setState] = useState<NetworkState>(initialState);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((s) => {
      setState({
        isConnected: s.isConnected ?? true,
        isInternetReachable: s.isInternetReachable,
        type: s.type ?? null,
      });
    });
    return unsubscribe;
  }, []);

  return state;
}

export function useIsOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetwork();
  return isConnected && isInternetReachable !== false;
}
