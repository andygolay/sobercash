import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
        return (
                <View style={styles.container}>
                        <Text style={styles.title}>SoberCash</Text>
                        <Text style={styles.subtitle}>See how much money and time you've saved by staying sober!</Text>
                </View>
        );
}

const styles = StyleSheet.create({
        container: {
                flex: 1,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 20,
        },
        title: {
                fontSize: 32,
                fontWeight: 'bold',
                color: '#2c3e50',
                marginBottom: 20,
                textAlign: 'center',
        },
        subtitle: {
                fontSize: 18,
                color: '#7f8c8d',
                textAlign: 'center',
                lineHeight: 24,
        },
});
