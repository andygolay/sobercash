import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Props mirror your web API, adapted for React Native
// connected: boolean
// publicKey?: string
// onConnect: () => Promise<void>
// onDisconnect: () => Promise<void>
export default function StarryButton({ connected, publicKey, onConnect, onDisconnect }) {
  const [connecting, setConnecting] = React.useState(false);

  const handlePress = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      if (connected) {
        await onDisconnect();
      } else {
        await onConnect();
      }
    } finally {
      setConnecting(false);
    }
  };

  const label = connected ? (publicKey ? publicKey.substring(0, 10) : 'Connected') : 'Connect';

  return (
    <TouchableOpacity style={[styles.button, connected && styles.buttonConnected]} onPress={handlePress} activeOpacity={0.85}>
      <View style={styles.inner}>
        <Text style={styles.text}>{connecting ? (connected ? 'Disconnecting...' : 'Connecting...') : label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#000',
    width: 180,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonConnected: {
    backgroundColor: '#111',
  },
  inner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
