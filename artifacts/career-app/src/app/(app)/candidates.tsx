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
import { APP_COLORS } from "@/constants/theme";

type CandidateApplication = {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  applicantName: string;
  applicantEmail: string | null;
  applicantPhone: string | null;
  applicantProfile: {
    headline?: string;
    location?: string;
    strengths?: string[];
  } | null;
  status: string;
  appliedAt: string;
};

type SuggestedCandidate = {
  id: string;
  name: string;
  city: string | null;
  matchScore: number;
  profile: {
    headline?: string;
    location?: string;
    summary?: string;
    strengths?: string[];
  };
};

type RecruiterJob = { id: string; title: string };

const NEXT_STATUSES: Record<string, string[]> = {
  applied: ["viewed", "rejected"],
  viewed: ["shortlisted", "interview", "rejected"],
  shortlisted: ["interview", "rejected"],
  interview: ["selected", "rejected"],
};

const STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  viewed: "In review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  selected: "Selected",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

export default function CandidatesScreen() {
  const router = useRouter();
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [recruiterJobs, setRecruiterJobs] = useState<RecruiterJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [suggestedCandidates, setSuggestedCandidates] = useState<
    SuggestedCandidate[]
  >([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError("");
    setNeedsVerification(false);
    try {
      const [applicationsResponse, jobsResponse] = await Promise.all([
        apiRequest<{ applications: CandidateApplication[] }>("/applications"),
        apiRequest<{ jobs: RecruiterJob[] }>("/jobs/mine"),
      ]);
      setApplications(applicationsResponse.applications || []);
      setRecruiterJobs(jobsResponse.jobs || []);
      setSelectedJobId(
        (current) => current || jobsResponse.jobs?.[0]?.id || "",
      );
    } catch (loadError) {
      const message = errorMessage(loadError);
      setError(message);
      setNeedsVerification(
        loadError instanceof ApiError &&
          loadError.status === 403 &&
          message.toLowerCase().includes("verification"),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    if (!selectedJobId) {
      setSuggestedCandidates([]);
      return;
    }
    let active = true;
    setLoadingSuggestions(true);
    apiRequest<{ candidates: SuggestedCandidate[] }>(
      `/jobs/${encodeURIComponent(selectedJobId)}/candidates`,
    )
      .then((response) => {
        if (active) setSuggestedCandidates(response.candidates || []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoadingSuggestions(false);
      });
    return () => {
      active = false;
    };
  }, [selectedJobId]);

  const filteredApplications = useMemo(() => {
    const term = query.trim().toLowerCase();
    return applications.filter(
      (application) =>
        !term ||
        [
          application.applicantName,
          application.jobTitle,
          application.applicantProfile?.headline,
          application.applicantProfile?.location,
        ].some((value) => value?.toLowerCase().includes(term)),
    );
  }, [applications, query]);

  const filteredSuggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    return suggestedCandidates.filter(
      (candidate) =>
        !term ||
        [
          candidate.name,
          candidate.city,
          candidate.profile.headline,
          candidate.profile.location,
          ...(candidate.profile.strengths || []),
        ].some((value) => value?.toLowerCase().includes(term)),
    );
  }, [suggestedCandidates, query]);

  async function moveCandidate(
    application: CandidateApplication,
    status: string,
  ) {
    setUpdatingId(application.id);
    setError("");
    try {
      await apiRequest(`/applications/${encodeURIComponent(application.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setApplications((previous) =>
        previous.map((item) =>
          item.id === application.id ? { ...item, status } : item,
        ),
      );
    } catch (updateError) {
      setError(errorMessage(updateError));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Candidates</Text>
          <Text style={styles.subtitle}>
            Review applications and move candidates through your hiring
            pipeline.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadCandidates()}
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
          accessibilityLabel="Search candidates"
          value={query}
          onChangeText={setQuery}
          placeholder="Candidate, job, or location"
          placeholderTextColor={APP_COLORS.subtleText}
          style={styles.searchInput}
        />
      </View>

      {!!error && (
        <View accessibilityRole="alert" style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          {needsVerification && (
            <Pressable onPress={() => router.push("/(app)/company" as never)}>
              <Text style={styles.verifyLink}>Review company verification</Text>
            </Pressable>
          )}
        </View>
      )}

      {recruiterJobs.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>Suggested candidates</Text>
          <Text style={styles.sectionSubtitle}>
            Job seekers who opted in to recruiter profile discovery.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.jobPicker}
          >
            {recruiterJobs.map((job) => (
              <Pressable
                key={job.id}
                onPress={() => setSelectedJobId(job.id)}
                style={[
                  styles.jobChip,
                  selectedJobId === job.id && styles.jobChipSelected,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.jobChipText,
                    selectedJobId === job.id && styles.jobChipTextSelected,
                  ]}
                >
                  {job.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {loadingSuggestions ? (
            <ActivityIndicator color={APP_COLORS.primary} />
          ) : filteredSuggestions.length === 0 ? (
            <View style={styles.emptySuggestion}>
              <Text style={styles.emptyText}>
                {query
                  ? "No suggested profiles match your search."
                  : "No opted-in profile matches this role yet."}
              </Text>
            </View>
          ) : (
            <View style={styles.candidateList}>
              {filteredSuggestions.map((candidate) => (
                <View key={candidate.id} style={styles.suggestedCard}>
                  <View style={styles.candidateHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {candidate.name.trim().charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View style={styles.candidateInfo}>
                      <Text style={styles.candidateName}>{candidate.name}</Text>
                      <Text style={styles.jobTitle}>
                        {candidate.profile.headline || "Job seeker"}
                      </Text>
                    </View>
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchText}>
                        {candidate.matchScore}% match
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.metaText}>
                    {candidate.profile.location ||
                      candidate.city ||
                      "Location not provided"}
                  </Text>
                  {!!candidate.profile.summary && (
                    <Text style={styles.profileText} numberOfLines={3}>
                      {candidate.profile.summary}
                    </Text>
                  )}
                  {!!candidate.profile.strengths?.length && (
                    <Text style={styles.skillsText} numberOfLines={2}>
                      {candidate.profile.strengths.join(" · ")}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={APP_COLORS.primary} style={styles.loader} />
      ) : filteredApplications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {query ? "No matching candidates" : "No applications yet"}
          </Text>
          <Text style={styles.emptyText}>
            {query
              ? "Try another name, role, or location."
              : "Applications to your job postings will appear here."}
          </Text>
        </View>
      ) : (
        <View style={styles.candidateList}>
          {filteredApplications.map((application) => {
            const availableStatuses = NEXT_STATUSES[application.status] || [];
            return (
              <View key={application.id} style={styles.candidateCard}>
                <View style={styles.candidateHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {application.applicantName
                        ?.trim()
                        .charAt(0)
                        .toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={styles.candidateInfo}>
                    <Text style={styles.candidateName}>
                      {application.applicantName || "Candidate"}
                    </Text>
                    <Text style={styles.jobTitle}>{application.jobTitle}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {STATUS_LABELS[application.status] || application.status}
                    </Text>
                  </View>
                </View>

                {!!application.applicantProfile?.headline && (
                  <Text style={styles.profileText}>
                    {application.applicantProfile.headline}
                  </Text>
                )}
                <Text style={styles.metaText}>
                  {[
                    application.applicantProfile?.location,
                    application.applicantEmail,
                    application.applicantPhone,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Contact details are private"}
                </Text>
                {!!application.applicantProfile?.strengths?.length && (
                  <Text style={styles.skillsText} numberOfLines={2}>
                    {application.applicantProfile.strengths.join(" · ")}
                  </Text>
                )}
                <Text style={styles.appliedDate}>
                  Applied {new Date(application.appliedAt).toLocaleDateString()}
                </Text>

                {availableStatuses.length > 0 && (
                  <View style={styles.actions}>
                    {availableStatuses.map((status) => (
                      <Pressable
                        key={status}
                        disabled={updatingId === application.id}
                        onPress={() => void moveCandidate(application, status)}
                        style={[
                          styles.actionButton,
                          status === "rejected" && styles.rejectButton,
                          updatingId === application.id &&
                            styles.disabledButton,
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionText,
                            status === "rejected" && styles.rejectText,
                          ]}
                        >
                          {updatingId === application.id
                            ? "Saving…"
                            : STATUS_LABELS[status]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
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
  candidateList: { gap: 12 },
  suggestionsSection: { gap: 10 },
  sectionTitle: { color: APP_COLORS.text, fontSize: 17, fontWeight: "700" },
  sectionSubtitle: {
    color: APP_COLORS.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  jobPicker: { gap: 8, paddingVertical: 2 },
  jobChip: {
    maxWidth: 230,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  jobChipSelected: {
    backgroundColor: APP_COLORS.primarySoft,
    borderColor: APP_COLORS.primary,
  },
  jobChipText: { color: APP_COLORS.mutedText, fontSize: 12, fontWeight: "600" },
  jobChipTextSelected: { color: APP_COLORS.primary },
  emptySuggestion: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  suggestedCard: {
    padding: 15,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    gap: 9,
  },
  matchBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: APP_COLORS.successSoft,
  },
  matchText: { color: APP_COLORS.success, fontSize: 10, fontWeight: "700" },
  candidateCard: {
    padding: 16,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    gap: 10,
  },
  candidateHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: APP_COLORS.primarySoft,
  },
  avatarText: { color: APP_COLORS.primary, fontSize: 17, fontWeight: "700" },
  candidateInfo: { flex: 1 },
  candidateName: { color: APP_COLORS.text, fontSize: 15, fontWeight: "700" },
  jobTitle: { color: APP_COLORS.mutedText, fontSize: 12, marginTop: 3 },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: APP_COLORS.infoSoft,
  },
  statusText: { color: APP_COLORS.info, fontSize: 10, fontWeight: "700" },
  profileText: { color: APP_COLORS.text, fontSize: 13 },
  metaText: { color: APP_COLORS.mutedText, fontSize: 12, lineHeight: 17 },
  skillsText: { color: APP_COLORS.primary, fontSize: 12 },
  appliedDate: { color: APP_COLORS.subtleText, fontSize: 11 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 3 },
  actionButton: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: APP_COLORS.primary,
  },
  actionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  rejectButton: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectText: { color: APP_COLORS.error },
  disabledButton: { opacity: 0.55 },
  errorCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: APP_COLORS.errorSoft,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 8,
  },
  errorText: { color: APP_COLORS.error, fontSize: 13, lineHeight: 18 },
  verifyLink: { color: APP_COLORS.primary, fontSize: 13, fontWeight: "700" },
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
