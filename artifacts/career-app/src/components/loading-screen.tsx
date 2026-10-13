import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#2563EB" size="large" />
      <Text style={styles.text}>Checking authentication...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
});
