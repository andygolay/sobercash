import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import StarryButton from "../components/StarryButton";
import { usePetraWallet } from "../contexts/PetraWalletContext";

export default function HomeScreen({ navigation }) {
  console.log('HomeScreen rendering...');

  const { isConnected, walletAddress, isConnecting, connectWallet, disconnectWallet, signAndSubmitTransaction, signMessage, simulateConnection } = usePetraWallet();

  console.log('Wallet state:', { isConnected, walletAddress, isConnecting });

  const handleConnect = async () => {
    console.log('Connect button pressed!');
    try {
      if (isConnected) {
        console.log('Disconnecting wallet...');
        await disconnectWallet();
      } else {
        console.log('Connecting wallet...');
        await connectWallet();
      }
    } catch (error) {
      console.log('Error in handleConnect:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleTestTransaction = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    try {
      console.log('Testing transaction signing...');

      // Create a test transaction - exactly like official example
      const testTransaction = {
        arguments: [
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          10, // 0.0000001 APT (like official example)
        ],
        function: '0x1::coin::transfer',
        type: 'entry_function_payload',
        type_arguments: ['0x1::aptos_coin::AptosCoin'],
      };

      // Sign and submit the transaction
      await signAndSubmitTransaction(testTransaction);
      console.log('Transaction sent to Petra for signing');
    } catch (error) {
      console.log('Error in test transaction:', error);
      Alert.alert('Transaction Failed', error.message);
    }
  };

  const handleTestMessage = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    try {
      console.log('Testing message signing...');
      const message = 'I am signing this message via Petra Wallet';
      await signMessage(message);
      console.log('Message sent to Petra for signing');
    } catch (error) {
      console.log('Error in test message:', error);
      Alert.alert('Message Signing Failed', error.message);
    }
  };

  const handleTestDeepLink = async () => {
    try {
      console.log('Testing deep link...');
      await Linking.openURL('exp://vunyv2o-anonymous-8081.exp.direct/--/sobercash/connect?response=approved&data=test');
    } catch (error) {
      console.log('Error testing deep link:', error);
      Alert.alert('Deep Link Test Failed', error.message);
    }
  };

  const handleSimulateConnection = async () => {
    try {
      console.log('Simulating Petra connection...');
      simulateConnection();
    } catch (error) {
      console.log('Error simulating connection:', error);
      Alert.alert('Simulation Failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <Text style={styles.savingsText}>
          You've saved $____ and ____ hours by staying sober!
        </Text>

        <TouchableOpacity
          style={[styles.testButton, styles.deepLinkButton]}
          onPress={handleTestDeepLink}
        >
          <Text style={styles.testButtonText}>Test Deep Link</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, styles.simulateButton]}
          onPress={handleSimulateConnection}
        >
          <Text style={styles.testButtonText}>Simulate Connection</Text>
        </TouchableOpacity>

        {isConnected && walletAddress && (
          <View style={styles.walletInfo}>
            <Text style={styles.walletLabel}>Connected Wallet:</Text>
            <Text style={styles.walletAddress}>{walletAddress}</Text>

            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestTransaction}
            >
              <Text style={styles.testButtonText}>Test Transaction</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, styles.messageButton]}
              onPress={handleTestMessage}
            >
              <Text style={styles.testButtonText}>Sign Message</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={[styles.footerButton, isConnecting && styles.footerButtonDisabled]}>
          <StarryButton
            connected={isConnected}
            publicKey={walletAddress || undefined}
            onConnect={connectWallet}
            onDisconnect={disconnectWallet}
          />
        </View>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => navigation.navigate("PrivacyTerms")}
        >
          <Text style={styles.footerButtonText}>Privacy & Terms</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => navigation.navigate("Settings")}
        >
          <Ionicons name="settings" size={24} color="#2c3e50" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mainContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  savingsText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "center",
    lineHeight: 36,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
    backgroundColor: "#f8f9fa",
  },
  footerButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  footerButtonText: {
    fontSize: 16,
    color: "#2c3e50",
    fontWeight: "500",
  },
  footerButtonDisabled: {
    opacity: 0.6,
  },
  walletInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  walletLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 5,
  },
  walletAddress: {
    fontSize: 12,
    color: "#2c3e50",
    fontFamily: "monospace",
    textAlign: "center",
  },
  testButton: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    alignItems: "center",
  },
  testButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  messageButton: {
    backgroundColor: "#17a2b8",
    marginTop: 8,
  },
  deepLinkButton: {
    backgroundColor: "#6f42c1",
    marginTop: 8,
  },
  simulateButton: {
    backgroundColor: "#fd7e14",
    marginTop: 8,
  },
});
