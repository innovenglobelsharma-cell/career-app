import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { useAuth } from "@/auth/auth-provider";
import { APP_COLORS, AppIconName, MaxContentWidth } from "@/constants/theme";
import { ROLE_LABEL } from "@/constants/roles";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const PROFILE_ICON: AppIconName = {
  ios: "person.crop.circle",
  android: "account_circle",
  web: "account_circle",
};

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { currentUser } = useAuth();

  return (
    <PlaceholderScreen
      title="My Profile"
      subtitle="Account details from Careerly"
      icon={PROFILE_ICON}
    >
      <View style={styles.card}>
        <View style={styles.avatar}>
          <SymbolView
            name={{
              ios: PROFILE_ICON.ios,
              android: PROFILE_ICON.android,
              web: PROFILE_ICON.web,
            }}
            size={36}
            tintColor={APP_COLORS.primary}
          />
        </View>
        <Text style={styles.name}>{currentUser?.name ?? "User"}</Text>
        <Text style={styles.role}>
          {currentUser ? (ROLE_LABEL[currentUser.role] ?? "User") : "User"}
        </Text>

        <View style={styles.divider} />

        <ProfileRow label="Email" value={currentUser?.email ?? ""} />
        <ProfileRow
          label="Mobile"
          value={
            currentUser?.phoneNumber
              ? `+91 ${currentUser.phoneNumber}`
              : "Not linked"
          }
        />
        <ProfileRow label="City" value={currentUser?.city ?? "Not set"} />
        <ProfileRow
          label="Member since"
          value={
            currentUser?.createdAt
              ? new Date(currentUser.createdAt).toLocaleDateString()
              : ""
          }
        />
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: MaxContentWidth,
    marginTop: 24,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 24,
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: APP_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: APP_COLORS.text,
  },
  role: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: APP_COLORS.mutedText,
  },
  divider: {
    alignSelf: "stretch",
    height: 1,
    backgroundColor: APP_COLORS.divider,
    marginVertical: 20,
  },
  row: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    paddingVertical: 10,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: APP_COLORS.mutedText,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "700",
    color: APP_COLORS.text,
    flexShrink: 1,
  },
});
