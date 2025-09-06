import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeScreen({ navigation }) {
  const handleConnect = () => {
    // TODO: Implement wallet connection
    console.log("Connect button pressed");
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <Text style={styles.savingsText}>
          You've saved $____ and ____ hours by staying sober!
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={handleConnect}>
          <Text style={styles.footerButtonText}>Connect</Text>
        </TouchableOpacity>

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
});
