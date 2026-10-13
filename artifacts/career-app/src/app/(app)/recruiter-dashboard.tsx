import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-provider";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { apiRequest } from "@/api/client";

type Job = {
  id: string;
  title: string;
  location: string;
  type: string;
  mode: string;
  status: string;
  views: number;
  applicationsCount: number;
  matchQuality?: number;
  createdAt: string;
};

type Application = {
  id: string;
  jobTitle: string;
  applicant: { name: string; email: string };
  status: string;
  appliedAt: string;
};

type Company = {
  id: string;
  name: string;
  verificationStatus: string;
  logo?: string;
};

const DASHBOARD_ICON: AppIconName = {
  ios: "square.grid.2x2",
  android: "dashboard",
  web: "dashboard",
};

export default function RecruiterDashboardScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const stats = {
    activeJobs: jobs.filter((j) => j.status === "Approved").length,
    newCandidates: applications.filter((a) => a.status === "Applied").length,
    interviews: applications.filter((a) => a.status === "Interview").length,
    pendingJobs: jobs.filter((j) => j.status === "Pending approval").length,
  };

  const recentApplications = applications.slice(0, 5);
  const pendingPostings = jobs
    .filter((j) => j.status === "Pending approval")
    .slice(0, 5);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [companyRes, jobsRes, appsRes] = await Promise.all([
          apiRequest<{ company: Company }>("/companies/me"),
          apiRequest<{ jobs: Job[] }>("/jobs/mine"),
          apiRequest<{
            applications: Array<
              Omit<Application, "applicant"> & {
                applicantName: string;
                applicantEmail: string | null;
              }
            >;
          }>("/applications"),
        ]);

        setCompany(companyRes?.company || null);
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
        setApplications(
          (appsRes?.applications || []).map((application) => ({
            ...application,
            status:
              (
                {
                  applied: "Applied",
                  viewed: "Review",
                  shortlisted: "Shortlisted",
                  interview: "Interview",
                  selected: "Selected",
                  rejected: "Rejected",
                  withdrawn: "Withdrawn",
                } as Record<string, string>
              )[application.status] || application.status,
            applicant: {
              name: application.applicantName || "Candidate",
              email: application.applicantEmail || "",
            },
          })),
        );
      } catch (err) {
        console.error("Failed to load recruiter dashboard:", err);
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
          name={DASHBOARD_ICON}
          size={48}
          tintColor={APP_COLORS.primary}
        />
      </View>
    );
  }

  const showVerificationBanner = company?.verificationStatus !== "verified";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Welcome back, {currentUser?.name?.split(" ")[0] || "there"}!
            </Text>
          </View>
          {company?.logo && (
            <View style={[styles.companyLogo, { backgroundColor: "#E0E7FF" }]}>
              <Text style={styles.companyLogoText}>{company.logo}</Text>
            </View>
          )}
        </View>

        {showVerificationBanner && (
          <View style={styles.verificationBanner}>
            <View style={styles.verificationIcon}>
              <SymbolView
                name={{
                  ios: "shield.lefthalf.filled",
                  android: "security",
                  web: "security",
                }}
                size={20}
                tintColor="#FFFFFF"
              />
            </View>
            <View style={styles.verificationContent}>
              <Text style={styles.verificationTitle}>
                Company verification required
              </Text>
              <Text style={styles.verificationText}>
                Your company must be verified before you can post jobs and
                message candidates.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(app)/company" as never)}
              style={styles.verificationButton}
            >
              <Text style={styles.verificationButtonText}>Verify now</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.statsGrid}>
          <StatCard
            label="Active jobs"
            value={stats.activeJobs}
            subtitle="Published roles"
            icon={{ ios: "briefcase.fill", android: "work", web: "work" }}
            iconBg={APP_COLORS.primarySoft}
            iconColor={APP_COLORS.primary}
            onPress={() => router.push("/(app)/jobs" as never)}
          />
          <StatCard
            label="New candidates"
            value={stats.newCandidates}
            subtitle="Applied to your jobs"
            icon={{ ios: "person.2.fill", android: "group", web: "group" }}
            iconBg={APP_COLORS.successSoft}
            iconColor={APP_COLORS.success}
            onPress={() => router.push("/(app)/candidates" as never)}
          />
          <StatCard
            label="Interviews"
            value={stats.interviews}
            subtitle="Scheduled"
            icon={{ ios: "calendar", android: "event", web: "event" }}
            iconBg={APP_COLORS.warningSoft}
            iconColor={APP_COLORS.warning}
            onPress={() => router.push("/(app)/interviews" as never)}
          />
          <StatCard
            label="Pending jobs"
            value={stats.pendingJobs}
            subtitle="Awaiting review"
            icon={{ ios: "clock", android: "schedule", web: "schedule" }}
            iconBg={APP_COLORS.infoSoft}
            iconColor={APP_COLORS.info}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Hiring activity</Text>
              <Text style={styles.sectionSubtitle}>
                Recent applications for your company.
              </Text>
            </View>
            <View style={styles.sectionIcon}>
              <SymbolView
                name={{ ios: "person.2", android: "group", web: "group" }}
                size={17}
                tintColor={APP_COLORS.mutedText}
              />
            </View>
          </View>

          {recentApplications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No applications to show yet.</Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {recentApplications.map((app) => (
                <View key={app.id} style={styles.activityItem}>
                  <View style={styles.activityAvatar}>
                    <Text style={styles.activityAvatarText}>
                      {app.applicant.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>
                      {app.applicant.name} · {app.jobTitle}
                    </Text>
                    <Text style={styles.activityMeta}>
                      Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusColor(app.status) + "20",
                        borderColor: getStatusColor(app.status),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(app.status) },
                      ]}
                    >
                      {app.status}
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
              <Text style={styles.sectionTitle}>Recent activity</Text>
              <Text style={styles.sectionSubtitle}>
                Latest updates in your workspace.
              </Text>
            </View>
            <View style={styles.sectionIcon}>
              <SymbolView
                name={{
                  ios: "bell",
                  android: "notifications",
                  web: "notifications",
                }}
                size={17}
                tintColor={APP_COLORS.mutedText}
              />
            </View>
          </View>

          {recentApplications.slice(0, 3).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Your recent activity will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {recentApplications.slice(0, 3).map((app) => (
                <View key={app.id} style={styles.recentActivityItem}>
                  <View style={styles.recentAvatar}>
                    <SymbolView
                      name={{
                        ios: "person.2.fill",
                        android: "group",
                        web: "group",
                      }}
                      size={15}
                      tintColor={APP_COLORS.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.recentName}>
                      {app.applicant.name} applied
                    </Text>
                    <Text style={styles.recentMeta}>
                      {app.jobTitle} · {app.status}
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
              <Text style={styles.sectionTitle}>Job approval queue</Text>
              <Text style={styles.sectionSubtitle}>
                Jobs awaiting approval.
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
                    <Text style={styles.queueCompany}>{job.location}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusColor(job.status) + "20",
                        borderColor: getStatusColor(job.status),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(job.status) },
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

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Applied: APP_COLORS.info,
    Review: APP_COLORS.warning,
    Shortlisted: APP_COLORS.primary,
    Interview: APP_COLORS.primary,
    Selected: APP_COLORS.success,
    Rejected: APP_COLORS.error,
    Withdrawn: APP_COLORS.mutedText,
    "Pending approval": APP_COLORS.warning,
    Approved: APP_COLORS.success,
  };
  return colors[status] || APP_COLORS.mutedText;
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  companyLogoText: {
    fontSize: 20,
    fontWeight: "500",
    color: APP_COLORS.primary,
  },
  verificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 13,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    marginBottom: 20,
  },
  verificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#92400E",
  },
  verificationText: {
    marginTop: 2,
    fontSize: 12,
    color: "#B45309",
    lineHeight: 18,
  },
  verificationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F59E0B",
  },
  verificationButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FFFFFF",
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
  section: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 16,
    marginBottom: 16,
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
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: APP_COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  activityAvatarText: {
    fontSize: 14,
    fontWeight: "500",
    color: APP_COLORS.primary,
  },
  activityInfo: {
    flex: 1,
    minWidth: 0,
  },
  activityName: {
    fontSize: 14,
    fontWeight: "400",
    color: APP_COLORS.text,
  },
  activityMeta: {
    marginTop: 2,
    fontSize: 11,
    color: APP_COLORS.mutedText,
  },
  recentActivityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  recentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: APP_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  recentName: {
    fontSize: 13,
    fontWeight: "400",
    color: APP_COLORS.text,
  },
  recentMeta: {
    marginTop: 2,
    fontSize: 11,
    color: APP_COLORS.mutedText,
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
