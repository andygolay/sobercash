import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen({ navigation }) {
        return (
                <View style={styles.container}>
                        <View style={styles.header}>
                                <TouchableOpacity
                                        style={styles.backButton}
                                        onPress={() => navigation.goBack()}
                                >
                                        <Ionicons name="arrow-back" size={24} color="#2c3e50" />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>Settings</Text>
                                <View style={styles.placeholder} />
                        </View>

                        <View style={styles.content}>
                                <Text style={styles.placeholderText}>
                                        Settings content will be added here.
                                </Text>
                        </View>
                </View>
        );
}

const styles = StyleSheet.create({
        container: {
                flex: 1,
                backgroundColor: '#fff',
        },
        header: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 15,
                borderBottomWidth: 1,
                borderBottomColor: '#ecf0f1',
        },
        backButton: {
                padding: 5,
        },
        headerTitle: {
                fontSize: 18,
                fontWeight: '600',
                color: '#2c3e50',
        },
        placeholder: {
                width: 34,
        },
        content: {
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 20,
        },
        placeholderText: {
                fontSize: 16,
                color: '#7f8c8d',
                textAlign: 'center',
        },
});
