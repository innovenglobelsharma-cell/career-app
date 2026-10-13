import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import { ApiError } from "@/api/errors";
import { apiRequest } from "@/api/client";
import { useAuth } from "@/auth/auth-provider";
import { APP_COLORS } from "@/constants/theme";

type Job = {
  id: string;
  title: string;
  company: string;
  category: string;
  location: string;
  mode: string;
  type: string;
  experience: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  skills: string[];
  status: string;
  createdAt: string;
};

type Application = { id: string; jobId: string; status: string };

const JOB_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending approval",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
};

function formatSalary(job: Job) {
  if (job.salaryMin == null && job.salaryMax == null)
    return "Salary not listed";
  const format = (amount: number | null) =>
    amount == null ? null : `₹${amount.toLocaleString("en-IN")}`;
  return [format(job.salaryMin), format(job.salaryMax)]
    .filter(Boolean)
    .join(" – ");
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

export default function JobsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const isRecruiter = currentUser?.role === "recruiter";
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    setNeedsVerification(false);
    try {
      if (isRecruiter) {
        const response = await apiRequest<{ jobs: Job[] }>("/jobs/mine");
        setJobs(response.jobs || []);
      } else {
        const [jobsResponse, applicationsResponse] = await Promise.all([
          apiRequest<{ jobs: Job[] }>("/jobs"),
          apiRequest<{ applications: Application[] }>("/applications"),
        ]);
        setJobs(jobsResponse.jobs || []);
        setAppliedJobIds(
          new Set(
            (applicationsResponse.applications || []).map(
              (application) => application.jobId,
            ),
          ),
        );
      }
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      setError(message);
      setNeedsVerification(
        isRecruiter &&
          loadError instanceof ApiError &&
          loadError.status === 403 &&
          message.toLowerCase().includes("verification"),
      );
    } finally {
      setLoading(false);
    }
  }, [isRecruiter]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const visibleJobs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((job) =>
      [job.title, job.company, job.location, job.category, ...job.skills].some(
        (value) => value?.toLowerCase().includes(term),
      ),
    );
  }, [jobs, query]);

  async function applyToJob(job: Job) {
    setSaving(true);
    setError("");
    try {
      await apiRequest("/applications", {
        method: "POST",
        body: JSON.stringify({ jobId: job.id }),
      });
      setAppliedJobIds((previous) => new Set(previous).add(job.id));
    } catch (applyError) {
      setError(getErrorMessage(applyError));
    } finally {
      setSaving(false);
    }
  }

  async function createJob() {
    const cleanTitle = title.trim();
    const cleanLocation = location.trim();
    const cleanDescription = description.trim();
    if (!cleanTitle || !cleanLocation || !cleanDescription) {
      setError("Add a job title, location, and description before posting.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await apiRequest("/jobs", {
        method: "POST",
        body: JSON.stringify({
          title: cleanTitle,
          location: cleanLocation,
          description: cleanDescription,
          category: "Other",
          mode: "On-site",
          type: "Full-time",
          experience: "Not specified",
          skills: [],
        }),
      });
      setTitle("");
      setLocation("");
      setDescription("");
      setShowPostForm(false);
      await loadJobs();
    } catch (createError) {
      const message = getErrorMessage(createError);
      setError(message);
      setNeedsVerification(
        createError instanceof ApiError &&
          createError.status === 403 &&
          message.toLowerCase().includes("verification"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeJobStatus(job: Job) {
    const nextStatus =
      job.status === "active"
        ? "paused"
        : job.status === "closed"
          ? null
          : "closed";
    if (!nextStatus) return;

    setSaving(true);
    setError("");
    try {
      const response = await apiRequest<{ job: Job }>(
        `/jobs/${encodeURIComponent(job.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      setJobs((previous) =>
        previous.map((item) =>
          item.id === job.id
            ? { ...item, ...response.job, company: item.company }
            : item,
        ),
      );
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>
            {isRecruiter ? "My jobs" : "Find jobs"}
          </Text>
          <Text style={styles.subtitle}>
            {isRecruiter
              ? "Create postings and manage your hiring pipeline."
              : "Search current openings and apply to roles that fit."}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadJobs()}
          style={styles.iconButton}
        >
          <SymbolView
            name={{
              ios: "arrow.clockwise",
              android: "refresh",
              web: "refresh",
            }}
            size={18}
            tintColor={APP_COLORS.primary}
          />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <SymbolView
          name={{ ios: "magnifyingglass", android: "search", web: "search" }}
          size={18}
          tintColor={APP_COLORS.mutedText}
        />
        <TextInput
          accessibilityLabel={isRecruiter ? "Search your jobs" : "Search jobs"}
          value={query}
          onChangeText={setQuery}
          placeholder="Role, company, skill, or location"
          placeholderTextColor={APP_COLORS.subtleText}
          style={styles.searchInput}
        />
      </View>

      {isRecruiter && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowPostForm((visible) => !visible)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {showPostForm ? "Cancel" : "Post a job"}
          </Text>
        </Pressable>
      )}

      {showPostForm && isRecruiter && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New job posting</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Job title"
            placeholderTextColor={APP_COLORS.subtleText}
            style={styles.input}
            maxLength={180}
          />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Location"
            placeholderTextColor={APP_COLORS.subtleText}
            style={styles.input}
            maxLength={140}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Job description"
            placeholderTextColor={APP_COLORS.subtleText}
            style={[styles.input, styles.multilineInput]}
            multiline
            textAlignVertical="top"
            maxLength={20000}
          />
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void createJob()}
            style={[styles.primaryButton, saving && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? "Posting…" : "Submit for approval"}
            </Text>
          </Pressable>
        </View>
      )}

      {needsVerification && (
        <Pressable
          onPress={() => router.push("/(app)/company" as never)}
          style={styles.noticeCard}
        >
          <Text style={styles.noticeTitle}>
            Verify your company to continue
          </Text>
          <Text style={styles.noticeText}>
            Recruiter job tools are available after company verification. Tap
            here to review your company profile.
          </Text>
        </Pressable>
      )}

      {!!error && (
        <View accessibilityRole="alert" style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={APP_COLORS.primary} style={styles.loader} />
      ) : visibleJobs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {query
              ? "No matching jobs"
              : isRecruiter
                ? "No job postings yet"
                : "No jobs available"}
          </Text>
          <Text style={styles.emptyText}>
            {query
              ? "Try another search term."
              : isRecruiter
                ? "Post your first role to start receiving applications."
                : "Check back soon for new openings."}
          </Text>
        </View>
      ) : (
        <View style={styles.jobList}>
          {visibleJobs.map((job) => {
            const hasApplied = appliedJobIds.has(job.id);
            return (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <View style={styles.jobTitleGroup}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <Text style={styles.company}>{job.company}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      job.status === "active"
                        ? styles.activeBadge
                        : styles.pendingBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        job.status === "active"
                          ? styles.activeText
                          : styles.pendingText,
                      ]}
                    >
                      {JOB_STATUS_LABELS[job.status] || job.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.jobMeta}>
                  {[job.location, job.mode, job.type, job.experience]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Text style={styles.salary}>{formatSalary(job)}</Text>
                {!!job.skills?.length && (
                  <Text style={styles.skills} numberOfLines={2}>
                    {job.skills.join(" · ")}
                  </Text>
                )}
                {!!job.description && (
                  <Text style={styles.description} numberOfLines={3}>
                    {job.description}
                  </Text>
                )}
                {isRecruiter ? (
                  job.status !== "closed" && (
                    <Pressable
                      disabled={saving}
                      onPress={() => void changeJobStatus(job)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {job.status === "active"
                          ? "Pause posting"
                          : "Close posting"}
                      </Text>
                    </Pressable>
                  )
                ) : (
                  <Pressable
                    disabled={saving || hasApplied}
                    onPress={() => void applyToJob(job)}
                    style={[
                      styles.primaryButton,
                      (saving || hasApplied) && styles.disabledButton,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {hasApplied ? "Applied" : saving ? "Applying…" : "Apply"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.canvas },
  content: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headingCopy: { flex: 1 },
  title: { color: APP_COLORS.text, fontSize: 24, fontWeight: "700" },
  subtitle: {
    color: APP_COLORS.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 48,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: APP_COLORS.text,
    fontSize: 14,
    paddingVertical: 10,
  },
  jobList: { gap: 12 },
  jobCard: {
    padding: 16,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    gap: 11,
  },
  jobHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  jobTitleGroup: { flex: 1 },
  jobTitle: { color: APP_COLORS.text, fontSize: 17, fontWeight: "700" },
  company: { color: APP_COLORS.mutedText, marginTop: 3, fontSize: 13 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  activeBadge: { backgroundColor: APP_COLORS.successSoft },
  pendingBadge: { backgroundColor: APP_COLORS.warningSoft },
  statusText: { fontSize: 11, fontWeight: "700" },
  activeText: { color: APP_COLORS.success },
  pendingText: { color: APP_COLORS.warning },
  jobMeta: { color: APP_COLORS.mutedText, fontSize: 12 },
  salary: { color: APP_COLORS.text, fontSize: 13, fontWeight: "600" },
  skills: { color: APP_COLORS.primary, fontSize: 12 },
  description: { color: APP_COLORS.mutedText, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: APP_COLORS.primary,
    borderRadius: 10,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryButton: {
    alignSelf: "flex-start",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: APP_COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  disabledButton: { opacity: 0.58 },
  formCard: {
    padding: 16,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    gap: 11,
  },
  formTitle: { color: APP_COLORS.text, fontSize: 16, fontWeight: "700" },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: APP_COLORS.text,
    backgroundColor: "#FFFFFF",
    fontSize: 14,
  },
  multilineInput: { minHeight: 110 },
  noticeCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
    backgroundColor: APP_COLORS.warningSoft,
    gap: 5,
  },
  noticeTitle: { color: "#92400E", fontSize: 14, fontWeight: "700" },
  noticeText: { color: "#B45309", fontSize: 12, lineHeight: 18 },
  errorCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: APP_COLORS.errorSoft,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { color: APP_COLORS.error, fontSize: 13, lineHeight: 18 },
  loader: { marginTop: 32 },
  emptyCard: {
    padding: 24,
    alignItems: "center",
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
  },
  emptyTitle: { color: APP_COLORS.text, fontSize: 16, fontWeight: "700" },
  emptyText: {
    color: APP_COLORS.mutedText,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
});
