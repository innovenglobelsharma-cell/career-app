import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-provider";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { apiRequest } from "@/api/client";

type Ticket = {
  id: string;
  subject: string;
  openedBy: string;
  priority: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
};
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function SupportDashboardScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const stats = {
    openTickets: tickets.filter((t) => t.status !== "Resolved").length,
    escalatedTickets: tickets.filter((t) => t.status === "Escalated").length,
    highPriority: tickets.filter(
      (t) => t.priority === "High" || t.priority === "Urgent",
    ).length,
    resolvedTickets: tickets.filter((t) => t.status === "Resolved").length,
  };

  const priorityQueue = tickets
    .filter((t) => t.status !== "Resolved")
    .sort((a, b) => {
      const priorityOrder = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
      return (
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
      );
    })
    .slice(0, 5);

  const workflowBreakdown: Array<[string, number]> = [
    ["Open", tickets.filter((t) => t.status === "Open").length],
    ["In progress", tickets.filter((t) => t.status === "In progress").length],
    [
      "Waiting for user",
      tickets.filter((t) => t.status === "Waiting for user").length,
    ],
    ["Escalated", tickets.filter((t) => t.status === "Escalated").length],
    ["Resolved", tickets.filter((t) => t.status === "Resolved").length],
  ];
  const workflowTotal = workflowBreakdown.reduce(
    (sum, [, count]) => sum + count,
    0,
  );

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [ticketsRes, usersRes] = await Promise.all([
          apiRequest<{ tickets: Ticket[] }>("/admin/support-tickets"),
          apiRequest<{ users: User[] }>("/admin/users"),
        ]);

        setTickets(ticketsRes?.tickets || []);
        setUsers(usersRes?.users || []);
      } catch (err) {
        console.error("Failed to load support dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SymbolView
          name={{
            ios: "headset",
            android: "support_agent",
            web: "support_agent",
          }}
          size={48}
          tintColor={APP_COLORS.primary}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Support Desk</Text>
            <Text style={styles.headerSubtitle}>
              Support operations overview
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Open tickets"
            value={stats.openTickets}
            subtitle="In your queue"
            icon={{
              ios: "ticket.fill",
              android: "confirmation_number",
              web: "confirmation_number",
            }}
            iconBg={APP_COLORS.primarySoft}
            iconColor={APP_COLORS.primary}
            onPress={() => router.push("/(app)/support/all-tickets" as never)}
          />
          <StatCard
            label="Escalated tickets"
            value={stats.escalatedTickets}
            subtitle="Needs attention"
            icon={{
              ios: "exclamationmark.triangle.fill",
              android: "warning",
              web: "warning",
            }}
            iconBg={APP_COLORS.errorSoft}
            iconColor={APP_COLORS.error}
            onPress={() => router.push("/(app)/support/escalated" as never)}
          />
          <StatCard
            label="High priority"
            value={stats.highPriority}
            subtitle="Act now"
            icon={{ ios: "flag.fill", android: "flag", web: "flag" }}
            iconBg={APP_COLORS.warningSoft}
            iconColor={APP_COLORS.warning}
            onPress={() => router.push("/(app)/support/all-tickets" as never)}
          />
          <StatCard
            label="Resolved"
            value={stats.resolvedTickets}
            subtitle="Completed tickets"
            icon={{
              ios: "checkmark.circle.fill",
              android: "check_circle",
              web: "check_circle",
            }}
            iconBg={APP_COLORS.successSoft}
            iconColor={APP_COLORS.success}
            onPress={() => router.push("/(app)/support/all-tickets" as never)}
          />
        </View>

        <View style={styles.twoColumnGrid}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Priority queue</Text>
                <Text style={styles.sectionSubtitle}>
                  Tickets requiring attention
                </Text>
              </View>
            </View>

            {priorityQueue.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  All caught up — no open tickets.
                </Text>
              </View>
            ) : (
              <View style={styles.queueList}>
                {priorityQueue.map((ticket) => (
                  <View key={ticket.id} style={styles.queueItem}>
                    <View style={styles.queueInfo}>
                      <View style={styles.queueHeader}>
                        <Text style={styles.queueTitle} numberOfLines={1}>
                          {ticket.subject}
                        </Text>
                        <View
                          style={[
                            styles.priorityBadge,
                            {
                              backgroundColor:
                                getPriorityColor(ticket.priority) + "20",
                              borderColor: getPriorityColor(ticket.priority),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityText,
                              { color: getPriorityColor(ticket.priority) },
                            ]}
                          >
                            {ticket.priority}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.queueMeta}>
                        {ticket.openedBy} · {ticket.status}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusColor(ticket.status) + "20",
                          borderColor: getStatusColor(ticket.status),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(ticket.status) },
                        ]}
                      >
                        {ticket.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Ticket workflow</Text>
                <Text style={styles.sectionSubtitle}>
                  Distribution by status
                </Text>
              </View>
            </View>
            <View style={styles.workflowChart}>
              {workflowBreakdown.map(([label, count]) => (
                <WorkflowBar
                  key={label}
                  label={label}
                  count={count}
                  total={workflowTotal}
                  color={getWorkflowColor(label)}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Team performance</Text>
              <Text style={styles.sectionSubtitle}>Support agent metrics</Text>
            </View>
            <Pressable
              onPress={() => router.push("/(app)/support/performance" as never)}
              style={styles.sectionAction}
            >
              <Text style={styles.sectionActionText}>View all</Text>
              <SymbolView
                name={{
                  ios: "arrow.up.right",
                  android: "arrow_upward",
                  web: "arrow_upward",
                }}
                size={13}
                tintColor={APP_COLORS.primary}
              />
            </Pressable>
          </View>

          <View style={styles.performanceGrid}>
            <PerformanceCard
              label="Avg response time"
              value="2.4h"
              trend="−12%"
              trendColor={APP_COLORS.success}
              icon={{ ios: "clock.fill", android: "schedule", web: "schedule" }}
            />
            <PerformanceCard
              label="Resolution rate"
              value="94%"
              trend="+3%"
              trendColor={APP_COLORS.success}
              icon={{
                ios: "checkmark.circle.fill",
                android: "check_circle",
                web: "check_circle",
              }}
            />
            <PerformanceCard
              label="Satisfaction"
              value="4.7/5"
              trend="+0.2"
              trendColor={APP_COLORS.success}
              icon={{ ios: "star.fill", android: "star", web: "star" }}
            />
            <PerformanceCard
              label="Tickets/agent"
              value="18"
              trend="−2"
              trendColor={APP_COLORS.success}
              icon={{ ios: "person.2.fill", android: "group", web: "group" }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  onPress,
}: {
  label: string;
  value: number | string;
  subtitle: string;
  icon: AppIconName;
  iconBg: string;
  iconColor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.statCard}>
      <View style={styles.statCardTop}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={[styles.statIconContainer, { backgroundColor: iconBg }]}>
          <SymbolView name={icon} size={18} tintColor={iconColor} />
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function PerformanceCard({
  label,
  value,
  trend,
  trendColor,
  icon,
}: {
  label: string;
  value: string;
  trend: string;
  trendColor: string;
  icon: AppIconName;
}) {
  return (
    <View style={styles.performanceCard}>
      <View style={styles.performanceIcon}>
        <SymbolView name={icon} size={20} tintColor={APP_COLORS.primary} />
      </View>
      <Text style={styles.performanceValue}>{value}</Text>
      <Text style={styles.performanceLabel}>{label}</Text>
      <Text style={[styles.performanceTrend, { color: trendColor }]}>
        {trend} vs last week
      </Text>
    </View>
  );
}

function WorkflowBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.workflowBar}>
      <View style={styles.workflowLabel}>
        <Text style={styles.workflowLabelText}>{label}</Text>
        <Text style={styles.workflowCount}>{count}</Text>
      </View>
      <View style={styles.workflowTrack}>
        <View
          style={[
            styles.workflowFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    Urgent: APP_COLORS.error,
    High: APP_COLORS.warning,
    Medium: APP_COLORS.info,
    Low: APP_COLORS.success,
  };
  return colors[priority] || APP_COLORS.mutedText;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Open: APP_COLORS.info,
    "In progress": APP_COLORS.primary,
    "Waiting for user": APP_COLORS.warning,
    Escalated: APP_COLORS.error,
    Resolved: APP_COLORS.success,
  };
  return colors[status] || APP_COLORS.mutedText;
}

function getWorkflowColor(label: string): string {
  const colors: Record<string, string> = {
    "Pending approval": APP_COLORS.warning,
    Published: APP_COLORS.success,
    Rejected: APP_COLORS.error,
    Open: APP_COLORS.info,
    "In progress": APP_COLORS.primary,
    "Waiting for user": APP_COLORS.warning,
    Escalated: APP_COLORS.error,
    Resolved: APP_COLORS.success,
  };
  return colors[label] || APP_COLORS.mutedText;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.canvas,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "500",
    color: APP_COLORS.text,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: APP_COLORS.mutedText,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: "46%",
    maxWidth: "48%",
    backgroundColor: APP_COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 14,
  },
  statCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "400",
    color: APP_COLORS.mutedText,
  },
  statIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 25,
    fontWeight: "500",
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: APP_COLORS.mutedText,
  },
  twoColumnGrid: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 20,
  },
  section: {
    width: "100%",
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: APP_COLORS.text,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: APP_COLORS.mutedText,
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: "500",
    color: APP_COLORS.primary,
  },
  queueList: {
    gap: 8,
  },
  queueItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  queueInfo: {
    flex: 1,
  },
  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: "400",
    color: APP_COLORS.text,
  },
  queueMeta: {
    fontSize: 12,
    color: APP_COLORS.mutedText,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  workflowChart: {
    gap: 12,
  },
  workflowBar: {
    gap: 8,
  },
  workflowLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  workflowLabelText: {
    fontSize: 12,
    fontWeight: "400",
    color: APP_COLORS.text,
  },
  workflowCount: {
    fontSize: 12,
    fontWeight: "500",
    color: APP_COLORS.mutedText,
  },
  workflowTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: APP_COLORS.border,
    overflow: "hidden",
  },
  workflowFill: {
    height: "100%",
    borderRadius: 4,
  },
  performanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  performanceCard: {
    flex: 1,
    minWidth: "46%",
    maxWidth: "48%",
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  performanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: "500",
    color: APP_COLORS.text,
  },
  performanceLabel: {
    fontSize: 11,
    color: APP_COLORS.mutedText,
    textAlign: "center",
  },
  performanceTrend: {
    fontSize: 10,
    fontWeight: "400",
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: APP_COLORS.mutedText,
    textAlign: "center",
  },
});
