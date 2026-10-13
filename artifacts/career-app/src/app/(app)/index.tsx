import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { useAuth } from "@/auth/auth-provider";
import { APP_COLORS, AppIconName, MaxContentWidth } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";
import { apiRequest } from "@/api/client";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  mode: string;
  experience: string;
  salary: string;
  skills: string[];
  description: string;
  status: string;
  logo: string;
  logoTone: string;
  tags: string[];
  createdAt: string;
};

type Application = {
  id: string;
  jobTitle: string;
  company: string;
  status: string;
  appliedAt: string;
  matchScore?: number;
};

type Profile = {
  headline?: string;
  location?: string;
  phone?: string;
  resumeName?: string;
  experiences?: any[];
  educations?: any[];
  strengths?: any[];
};

const OVERVIEW_ICON: AppIconName = {
  ios: "square.grid.2x2",
  android: "dashboard",
  web: "dashboard",
};

const CARD_ICONS = {
  profile: {
    ios: "person.crop.circle",
    android: "account_circle",
    web: "account_circle",
  },
  applications: { ios: "briefcase", android: "work", web: "work" },
  jobs: { ios: "target", android: "target", web: "target" },
} as const;

type Section = {
  id: string;
  type:
    | "hero"
    | "stats"
    | "jobs-header"
    | "job"
    | "pagination"
    | "apps-header"
    | "application";
  data?: any;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileStrength, setProfileStrength] = useState(0);
  const [activeApplicationCount, setActiveApplicationCount] = useState(0);
  const [recommendedPage, setRecommendedPage] = useState(1);
  const jobsPerPage = 2;

  const firstName = currentUser?.name?.trim().split(/\s+/)[0] || "there";

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const isJobSeeker = currentUser?.role === "job_seeker";
        const [profileRes, appsRes, jobsRes] = await Promise.all([
          isJobSeeker
            ? apiRequest<Profile>("/users/me/profile")
            : Promise.resolve<Profile>({}),
          apiRequest<{ applications: Application[] }>("/applications"),
          apiRequest<{ jobs: Job[] }>("/jobs"),
        ]);

        const seekerProfile = profileRes || {};
        const userApps = appsRes?.applications || [];
        const approvedJobs =
          jobsRes?.jobs.filter((j: Job) => j.status === "Approved") || [];

        setProfile(seekerProfile);
        setApplications(userApps);
        setRecommendedJobs(approvedJobs);

        const profileFields = [
          seekerProfile.headline,
          seekerProfile.location,
          seekerProfile.phone,
          seekerProfile.resumeName &&
            seekerProfile.resumeName !== "No resume uploaded",
          seekerProfile.experiences?.length,
          seekerProfile.educations?.length,
          seekerProfile.strengths?.length,
        ];
        const strength = Math.round(
          (profileFields.filter(Boolean).length / profileFields.length) * 100,
        );
        setProfileStrength(strength);

        const activeCount = userApps.filter(
          (app: Application) =>
            !["Selected", "Rejected", "Withdrawn"].includes(app.status),
        ).length;
        setActiveApplicationCount(activeCount);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [currentUser?.role]);

  const visibleRecommendedJobs = recommendedJobs.slice(
    (recommendedPage - 1) * jobsPerPage,
    recommendedPage * jobsPerPage,
  );
  const totalPages = Math.max(
    1,
    Math.ceil(recommendedJobs.length / jobsPerPage),
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SymbolView
          name={OVERVIEW_ICON}
          size={48}
          tintColor={APP_COLORS.primary}
        />
      </View>
    );
  }

  const sections: Section[] = [
    { id: "hero", type: "hero" },
    { id: "stats", type: "stats" },
    { id: "jobs-header", type: "jobs-header" },
    ...visibleRecommendedJobs.map((job) => ({
      id: `job-${job.id}`,
      type: "job",
      data: job,
    })),
    totalPages > 1 ? { id: "pagination", type: "pagination" } : null,
    { id: "apps-header", type: "apps-header" },
    ...applications
      .slice(0, 3)
      .map((app) => ({ id: `app-${app.id}`, type: "application", data: app })),
  ].filter(Boolean) as Section[];

  const renderSection = ({ item }: { item: Section }) => {
    switch (item.type) {
      case "hero":
        return renderHero();
      case "stats":
        return renderStats();
      case "jobs-header":
        return renderJobsHeader();
      case "job":
        return renderJobCard(item.data!);
      case "pagination":
        return renderPagination();
      case "apps-header":
        return renderApplicationsHeader();
      case "application":
        return renderApplicationCard(item.data!);
      default:
        return null;
    }
  };

  const renderHero = () => (
    <View style={styles.hero}>
      <View style={styles.heroContent}>
        <Text style={styles.heroEyebrow}>Your command center</Text>
        <Text style={styles.heroTitle}>
          Keep the momentum, <Text style={styles.heroName}>{firstName}.</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          Track your applications, explore current openings, and keep your
          profile up to date.
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/(app)/jobs" as never)}
        style={styles.heroButton}
      >
        <SymbolView
          name={{ ios: "magnifyingglass", android: "search", web: "search" }}
          size={16}
          tintColor="#FFFFFF"
        />
        <Text style={styles.heroButtonText}>Browse jobs</Text>
      </Pressable>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <View style={styles.statCardHeader}>
          <Text style={styles.statEyebrow}>Profile strength</Text>
          <View style={styles.statIconContainer}>
            <SymbolView
              name={CARD_ICONS.profile}
              size={20}
              tintColor={APP_COLORS.primary}
            />
          </View>
        </View>
        <View style={styles.progressRingContainer}>
          <ProgressRing value={profileStrength} size={80} strokeWidth={6} />
        </View>
        <Text style={styles.statValue}>{profileStrength}% complete</Text>
        <Text style={styles.statCopy}>
          Add your profile details to improve your visibility.
        </Text>
        <Pressable
          onPress={() => router.push("/(app)/profile" as never)}
          style={styles.statLink}
        >
          <Text style={styles.statLinkText}>Complete your profile</Text>
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

      <View style={styles.statCard}>
        <View style={styles.statCardHeader}>
          <Text style={styles.statEyebrow}>Active applications</Text>
          <View style={styles.statIconContainer}>
            <SymbolView
              name={CARD_ICONS.applications}
              size={16}
              tintColor={APP_COLORS.success}
            />
          </View>
        </View>
        <Text style={styles.statLargeValue}>{activeApplicationCount}</Text>
        <Text style={styles.statCopy}>Based on your applications</Text>
      </View>

      <View style={styles.statCard}>
        <View style={styles.statCardHeader}>
          <Text style={styles.statEyebrow}>Latest opening</Text>
          <View style={styles.statIconContainer}>
            <SymbolView
              name={CARD_ICONS.jobs}
              size={16}
              tintColor={APP_COLORS.warning}
            />
          </View>
        </View>
        <Text style={styles.statLargeValue} numberOfLines={1}>
          {recommendedJobs[0]?.title || "No recommendations yet"}
        </Text>
        {recommendedJobs[0] && (
          <Text style={styles.statCompany}>{recommendedJobs[0].company}</Text>
        )}
      </View>
    </View>
  );

  const renderJobsHeader = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Picked for your path</Text>
          <Text style={styles.sectionTitle}>Recommended jobs</Text>
        </View>
        <Pressable
          onPress={() => router.push("/(app)/jobs" as never)}
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
      {visibleRecommendedJobs.length === 0 && (
        <View style={styles.emptyJobs}>
          <SymbolView
            name={{ ios: "briefcase", android: "work", web: "work" }}
            size={32}
            tintColor={APP_COLORS.mutedText}
          />
          <Text style={styles.emptyText}>No jobs available right now</Text>
          <Text style={styles.emptySubtext}>
            Check back later for new opportunities
          </Text>
        </View>
      )}
    </View>
  );

  const renderJobCard = (job: Job) => (
    <Pressable style={styles.jobCard} onPress={() => {}}>
      <View style={styles.jobCardHeader}>
        <View style={[styles.logoContainer, { backgroundColor: job.logoTone }]}>
          <Text style={styles.logoText}>{job.logo}</Text>
        </View>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {job.title}
          </Text>
          <Text style={styles.jobCompany}>{job.company}</Text>
        </View>
      </View>
      <View style={styles.jobMeta}>
        <View style={styles.metaItem}>
          <SymbolView
            name={{
              ios: "mappin.and.ellipse",
              android: "location_on",
              web: "location_on",
            }}
            size={12}
            tintColor={APP_COLORS.mutedText}
          />
          <Text style={styles.metaText}>{job.location}</Text>
        </View>
        <View style={styles.metaDot} />
        <View style={styles.metaItem}>
          <Text style={styles.metaText}>{job.mode}</Text>
        </View>
        <View style={styles.metaDot} />
        <View style={styles.metaItem}>
          <Text style={styles.metaText}>{job.type}</Text>
        </View>
      </View>
      <View style={styles.jobTags}>
        {job.tags.slice(0, 2).map((tag) => (
          <Text key={tag} style={styles.jobTag}>
            {tag}
          </Text>
        ))}
        {job.tags.length > 2 && (
          <Text style={styles.jobTag}>+{job.tags.length - 2} more</Text>
        )}
      </View>
    </Pressable>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      <Pressable
        onPress={() => setRecommendedPage((p) => Math.max(1, p - 1))}
        disabled={recommendedPage === 1}
        style={[
          styles.pageButton,
          recommendedPage === 1 && styles.pageButtonDisabled,
        ]}
      >
        <SymbolView
          name={{
            ios: "chevron.left",
            android: "chevron_left",
            web: "chevron_left",
          }}
          size={20}
          tintColor={APP_COLORS.primary}
        />
      </Pressable>
      <Text style={styles.pageInfo}>
        Page {recommendedPage} of {totalPages}
      </Text>
      <Pressable
        onPress={() => setRecommendedPage((p) => Math.min(totalPages, p + 1))}
        disabled={recommendedPage === totalPages}
        style={[
          styles.pageButton,
          recommendedPage === totalPages && styles.pageButtonDisabled,
        ]}
      >
        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          size={20}
          tintColor={APP_COLORS.primary}
        />
      </Pressable>
    </View>
  );

  const renderApplicationsHeader = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Your activity</Text>
          <Text style={styles.sectionTitle}>Recent applications</Text>
        </View>
        <Pressable
          onPress={() => router.push("/(app)/applications" as never)}
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
      {applications.length === 0 && (
        <View style={styles.emptyState}>
          <SymbolView
            name={{
              ios: "doc.text",
              android: "description",
              web: "description",
            }}
            size={32}
            tintColor={APP_COLORS.mutedText}
          />
          <Text style={styles.emptyText}>No applications yet</Text>
          <Text style={styles.emptySubtext}>
            Apply to jobs to see them here
          </Text>
        </View>
      )}
    </View>
  );

  const renderApplicationCard = (application: Application) => {
    const statusColors: Record<string, string> = {
      Applied: APP_COLORS.info,
      Review: APP_COLORS.warning,
      Shortlisted: APP_COLORS.primary,
      Interview: APP_COLORS.primary,
      Selected: APP_COLORS.success,
      Rejected: APP_COLORS.error,
      Withdrawn: APP_COLORS.mutedText,
    };
    const statusColor =
      statusColors[application.status] || APP_COLORS.mutedText;

    return (
      <Pressable style={styles.applicationCard} onPress={() => {}}>
        <View style={styles.applicationHeader}>
          <View style={styles.applicationInfo}>
            <Text style={styles.applicationTitle} numberOfLines={1}>
              {application.jobTitle}
            </Text>
            <Text style={styles.applicationCompany}>{application.company}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "20", borderColor: statusColor },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {application.status}
            </Text>
          </View>
        </View>
        <Text style={styles.applicationDate}>
          Applied {new Date(application.appliedAt).toLocaleDateString()}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderSection}
        ItemSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        ListHeaderComponentStyle={styles.scrollContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(value / 100) * circumference} ${circumference}`;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={APP_COLORS.border}
          strokeWidth={strokeWidth}
          transform="rotate(-90, 50%, 50%)"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={APP_COLORS.success}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90, 50%, 50%)"
        />
      </Svg>
      <View
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: [{ translateX: -size / 2 }, { translateY: -size / 2 }],
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={styles.progressRingText}>{value}%</Text>
      </View>
    </View>
  );
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
  hero: {
    alignItems: "flex-start",
    marginBottom: 20,
    padding: 18,
    borderRadius: 14,
    backgroundColor: APP_COLORS.primarySoft,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  heroContent: {
    flex: 1,
    paddingRight: 16,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "400",
    letterSpacing: 1.5,
    color: APP_COLORS.primary,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "500",
    color: APP_COLORS.text,
    lineHeight: 32,
  },
  heroName: {
    color: APP_COLORS.primary,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: APP_COLORS.mutedText,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primary,
    marginTop: 14,
  },
  heroButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 22,
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
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statEyebrow: {
    fontSize: 11,
    fontWeight: "400",
    color: APP_COLORS.mutedText,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: APP_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRingContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  progressRingText: {
    fontSize: 18,
    fontWeight: "500",
    color: APP_COLORS.text,
  },
  statValue: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
    color: APP_COLORS.text,
    marginTop: 4,
  },
  statLargeValue: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "500",
    color: APP_COLORS.text,
    marginTop: 8,
  },
  statCompany: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "400",
    color: APP_COLORS.primary,
    marginTop: 4,
  },
  statCopy: {
    textAlign: "center",
    fontSize: 11,
    color: APP_COLORS.mutedText,
    marginTop: 4,
    lineHeight: 16,
  },
  statLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  statLinkText: {
    fontSize: 12,
    fontWeight: "500",
    color: APP_COLORS.primary,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "400",
    color: APP_COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "500",
    color: APP_COLORS.text,
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
  jobCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 16,
  },
  jobCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  jobInfo: {
    flex: 1,
    minWidth: 0,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: APP_COLORS.text,
  },
  jobCompany: {
    marginTop: 2,
    fontSize: 13,
    color: APP_COLORS.mutedText,
  },
  jobMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: APP_COLORS.mutedText,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: APP_COLORS.border,
  },
  jobTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  jobTag: {
    fontSize: 10,
    fontWeight: "400",
    color: APP_COLORS.primary,
    backgroundColor: APP_COLORS.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  pageButton: {
    padding: 8,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageInfo: {
    fontSize: 13,
    fontWeight: "400",
    color: APP_COLORS.text,
  },
  applicationCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 16,
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  applicationInfo: {
    flex: 1,
    minWidth: 0,
  },
  applicationTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: APP_COLORS.text,
  },
  applicationCompany: {
    marginTop: 2,
    fontSize: 13,
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
  applicationDate: {
    fontSize: 11,
    color: APP_COLORS.mutedText,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptyJobs: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: APP_COLORS.text,
  },
  emptySubtext: {
    fontSize: 13,
    color: APP_COLORS.mutedText,
    textAlign: "center",
  },
  sectionSeparator: {
    height: 8,
  },
});
