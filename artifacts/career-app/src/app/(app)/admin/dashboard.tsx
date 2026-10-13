import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";

import { APP_COLORS, AppIconName } from "@/constants/theme";
import { apiRequest } from "@/api/client";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};
type Job = {
  id: string;
  title: string;
  company: string;
  status: string;
  createdAt: string;
};
type Ticket = {
  id: string;
  subject: string;
  openedBy: string;
  priority: string;
  status: string;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const stats = {
    totalUsers: users.length,
    activeJobs: jobs.filter((j) => j.status === "Approved").length,
    pendingApprovals: jobs.filter((j) => j.status === "Pending approval")
      .length,
    openTickets: tickets.filter(
      (t) => t.status !== "Resolved" && t.status !== "Closed",
    ).length,
  };

  const pendingPostings = jobs
    .filter((j) => j.status === "Pending approval")
    .slice(0, 5);
  const recentUsers = users.slice(0, 5);

  const workflowBreakdown: Array<[string, number]> = [
    [
      "Pending approval",
      jobs.filter((j) => j.status === "Pending approval").length,
    ],
    ["Published", jobs.filter((j) => j.status === "Approved").length],
    ["Rejected", jobs.filter((j) => j.status === "Rejected").length],
  ];
  const workflowTotal = workflowBreakdown.reduce(
    (sum, [, count]) => sum + count,
    0,
  );

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [usersRes, jobsRes, ticketsRes] = await Promise.all([
          apiRequest<{ users: User[] }>("/admin/users"),
          apiRequest<{ jobs: Job[] }>("/jobs/mine"),
          apiRequest<{ tickets: Ticket[] }>("/admin/support-tickets"),
        ]);

        setUsers(usersRes?.users || []);
        setJobs(
          (jobsRes?.jobs || []).map((job) => ({
            ...job,
            status:
              job.status === "pending"
                ? "Pending approval"
                : job.status === "active"
                  ? "Approved"
                  : job.status,
          })),
        );
        setTickets(ticketsRes?.tickets || []);
      } catch (err) {
        console.error("Failed to load admin dashboard:", err);
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
            ios: "square.grid.2x2",
            android: "dashboard",
            web: "dashboard",
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
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Platform overview and system metrics
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Known accounts"
            value={stats.totalUsers}
            subtitle="Registered users"
            icon={{ ios: "person.2.fill", android: "group", web: "group" }}
            iconBg={APP_COLORS.primarySoft}
            iconColor={APP_COLORS.primary}
            onPress={() => router.push("/(app)/admin/users" as never)}
          />
          <StatCard
            label="Active jobs"
            value={stats.activeJobs}
            subtitle="Published roles"
            icon={{ ios: "briefcase.fill", android: "work", web: "work" }}
            iconBg={APP_COLORS.successSoft}
            iconColor={APP_COLORS.success}
            onPress={() => router.push("/(app)/admin/jobs" as never)}
          />
          <StatCard
            label="Pending approvals"
            value={stats.pendingApprovals}
            subtitle={stats.pendingApprovals ? "Needs review" : "All caught up"}
            icon={{ ios: "clock.fill", android: "schedule", web: "schedule" }}
            iconBg={
              stats.pendingApprovals
                ? APP_COLORS.warningSoft
                : APP_COLORS.successSoft
            }
            iconColor={
              stats.pendingApprovals ? APP_COLORS.warning : APP_COLORS.success
            }
            onPress={() => router.push("/(app)/admin/jobs" as never)}
          />
          <StatCard
            label="Open tickets"
            value={stats.openTickets}
            subtitle="Support queue"
            icon={{
              ios: "ticket.fill",
              android: "confirmation_number",
              web: "confirmation_number",
            }}
            iconBg={APP_COLORS.infoSoft}
            iconColor={APP_COLORS.info}
            onPress={() => router.push("/(app)/admin/support" as never)}
          />
        </View>

        <View style={styles.twoColumnGrid}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Job approval queue</Text>
                <Text style={styles.sectionSubtitle}>
                  Jobs awaiting admin review
                </Text>
              </View>
            </View>

            {pendingPostings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  All caught up — no pending approvals.
                </Text>
              </View>
            ) : (
              <View style={styles.queueList}>
                {pendingPostings.map((job) => (
                  <View key={job.id} style={styles.queueItem}>
                    <View style={styles.queueInfo}>
                      <Text style={styles.queueTitle}>{job.title}</Text>
                      <Text style={styles.queueCompany}>{job.company}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getJobStatusColor(job.status) + "20",
                          borderColor: getJobStatusColor(job.status),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getJobStatusColor(job.status) },
                        ]}
                      >
                        {job.status}
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
                <Text style={styles.sectionTitle}>Job workflow</Text>
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
              <Text style={styles.sectionTitle}>Recent users</Text>
              <Text style={styles.sectionSubtitle}>
                Latest platform registrations
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(app)/admin/users" as never)}
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

          {recentUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No users yet.</Text>
            </View>
          ) : (
            <View style={styles.userList}>
              {recentUsers.map((user) => (
                <View key={user.id} style={styles.userItem}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.name
                        .trim()
                        .split(/\s+/)
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userMeta}>
                      {user.email} · {user.role}
                    </Text>
                  </View>
                  <View style={styles.userRoleBadge}>
                    <Text style={styles.userRoleText}>
                      {user.role.replace("_", " ")}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
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

function getJobStatusColor(status: string): string {
  const colors: Record<string, string> = {
    "Pending approval": APP_COLORS.warning,
    Approved: APP_COLORS.success,
    Rejected: APP_COLORS.error,
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
  queueTitle: {
    fontSize: 14,
    fontWeight: "400",
    color: APP_COLORS.text,
  },
  queueCompany: {
    marginTop: 2,
    fontSize: 12,
    color: APP_COLORS.mutedText,
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
  userList: {
    gap: 12,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: "500",
    color: APP_COLORS.primary,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: "400",
    color: APP_COLORS.text,
  },
  userMeta: {
    marginTop: 2,
    fontSize: 11,
    color: APP_COLORS.mutedText,
  },
  userRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: APP_COLORS.primarySoft,
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: "500",
    color: APP_COLORS.primary,
    textTransform: "capitalize",
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
