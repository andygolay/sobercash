import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PrivacyTermsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Terms</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.paragraph}>
            This app does not collect any personal information at all, not even
            your name. However, your wallet address is stored on a public
            blockchain along with associated app data. So, if you'd like to use
            SoberCash anonymously, you can create a fresh wallet that hasn't
            been used before and fund it from an exchange or other method that
            keeps the source of funding private.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms of Use</Text>
          <Text style={styles.paragraph}>
            SoberCash is not intended to be used for any legal, medical, or
            official purpose. Estimates of time and money saved are meant to be
            motivational representations rather than exact figures used for
            personal accounting.
          </Text>

          <Text style={styles.paragraph}>
            SoberCash and its creator(s) accept no responsibility or liability
            for users' personal, emotional or general results in life from using
            this app.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {new Date().toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: "#495057",
    marginBottom: 16,
    textAlign: "left",
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#6c757d",
    fontStyle: "italic",
  },
});
