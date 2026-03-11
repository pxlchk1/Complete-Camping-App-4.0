/**
 * Admin Test Account Cleanup Screen
 *
 * 3-step flow:  List  ->  Confirm  ->  Results
 * For removing @alanawaters.com test accounts from Firebase Auth + app data.
 *
 * Rendered as a full-screen component within AdminDashboard (not a nav screen).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Share,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { db, auth } from "../config/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import ModalHeader from "../components/ModalHeader";
import {
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  DEEP_FOREST,
} from "../constants/colors";

// ─── Constants ───────────────────────────────────────────────
const TARGET_DOMAIN = "@alanawaters.com";
const DANGER_RED = "#B71C1C";
const DANGER_RED_BG = "#B71C1C18";
const SUCCESS_GREEN = "#2E7D32";

// ─── Types ───────────────────────────────────────────────────

interface TestAccount {
  uid: string;
  email: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  authProvider: string;
  createdAt?: any;
  lastActiveAt?: any;
  hasProfile: boolean;
  status: "active" | "incomplete" | "no_profile" | "test";
}

interface DeleteResult {
  uid: string;
  email: string;
  status: "deleted" | "failed" | "skipped";
  error?: string;
}

interface Props {
  onDismiss: () => void;
}

type Step = "list" | "confirm" | "results";

// ─── Component ───────────────────────────────────────────────

export default function AdminTestAccountCleanupScreen({ onDismiss }: Props) {
  const insets = useSafeAreaInsets();

  // Step state
  const [step, setStep] = useState<Step>("list");

  // List state
  const [accounts, setAccounts] = useState<TestAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm state
  const [confirmText, setConfirmText] = useState("");

  // Deletion state
  const [deleting, setDeleting] = useState(false);
  const [results, setResults] = useState<DeleteResult[]>([]);
  const [summary, setSummary] = useState({ deleted: 0, failed: 0, skipped: 0 });

  // Ref to prevent double-tap
  const deletingRef = useRef(false);

  // ─── Load accounts ──────────────────────────────────────
  const loadAccounts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const usersSnap = await getDocs(collection(db, "users"));
      const matched: TestAccount[] = [];

      for (const userDoc of usersSnap.docs) {
        const data = userDoc.data();
        const email = (data.email || "").toLowerCase().trim();
        if (!email.endsWith(TARGET_DOMAIN)) continue;

        // Check for profile doc
        let hasProfile = false;
        try {
          const profileSnap = await getDoc(doc(db, "profiles", userDoc.id));
          hasProfile = profileSnap.exists();
        } catch {
          // ignore
        }

        const hasRealHandle =
          !!data.handle && data.handle !== "user" && data.handle.trim() !== "";
        const hasRealName =
          !!data.displayName &&
          data.displayName !== "User" &&
          data.displayName !== "Anonymous User" &&
          data.displayName.trim() !== "";

        let status: TestAccount["status"] = "test";
        if (!hasProfile) status = "no_profile";
        else if (!hasRealHandle || !hasRealName) status = "incomplete";
        else status = "active";

        // Determine auth provider from stored data
        const provider =
          data.providerId ||
          data.authProvider ||
          data.provider ||
          (data.providerData?.[0]?.providerId) ||
          "password";
        const providerLabel =
          provider === "google.com"
            ? "Google"
            : provider === "apple.com"
              ? "Apple"
              : provider === "facebook.com"
                ? "Facebook"
                : "Email/Password";

        matched.push({
          uid: userDoc.id,
          email,
          handle: data.handle || "",
          displayName: data.displayName || "",
          avatarUrl: data.avatarUrl || data.photoURL || undefined,
          authProvider: providerLabel,
          createdAt: data.createdAt,
          lastActiveAt: data.lastActiveAt || data.lastLoginAt,
          hasProfile,
          status,
        });
      }

      // Sort newest first
      matched.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
        const bTime = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
        return bTime - aTime;
      });

      setAccounts(matched);
    } catch (err) {
      console.error("[AdminCleanup] loadAccounts error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // ─── Filtered list ──────────────────────────────────────
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const q = searchQuery.toLowerCase().trim();
    return accounts.filter(
      (a) =>
        a.email.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q) ||
        a.uid.toLowerCase().includes(q) ||
        a.displayName.toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  // ─── Selection helpers ──────────────────────────────────
  const toggleSelect = useCallback((uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredAccounts.forEach((a) => next.add(a.uid));
      return next;
    });
  }, [filteredAccounts]);

  const selectAllDomain = useCallback(() => {
    setSelectedIds(new Set(accounts.map((a) => a.uid)));
  }, [accounts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const allVisibleSelected =
    filteredAccounts.length > 0 &&
    filteredAccounts.every((a) => selectedIds.has(a.uid));
  const allDomainSelected =
    accounts.length > 0 && accounts.every((a) => selectedIds.has(a.uid));

  // ─── Delete flow ────────────────────────────────────────
  const selectedAccounts = useMemo(
    () => accounts.filter((a) => selectedIds.has(a.uid)),
    [accounts, selectedIds]
  );

  const expectedConfirmText = `DELETE ${selectedIds.size} ACCOUNTS`;
  const confirmMatches =
    confirmText.trim().toUpperCase() === expectedConfirmText;

  const handleStartDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmText("");
    setStep("confirm");
  }, [selectedIds]);

  const handleCancelConfirm = useCallback(() => {
    setStep("list");
    setConfirmText("");
  }, []);

  const handleExecuteDelete = useCallback(async () => {
    if (!confirmMatches || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Keyboard.dismiss();

    try {
      // Force-refresh the auth token so the callable receives valid credentials
      if (!auth.currentUser) {
        throw new Error("Not authenticated. Please sign out and sign back in.");
      }
      await auth.currentUser.getIdToken(true);

      const functions = getFunctions();
      const bulkDelete = httpsCallable<
        { uids: string[] },
        {
          summary: { deleted: number; failed: number; skipped: number };
          results: DeleteResult[];
        }
      >(functions, "adminBulkDeleteTestAccounts");

      const response = await bulkDelete({ uids: Array.from(selectedIds) });

      setResults(response.data.results);
      setSummary(response.data.summary);
      setStep("results");
    } catch (err: any) {
      const msg = err?.message || "Unknown error during deletion";
      console.error("[AdminCleanup] delete error:", err);
      // Show single failed result so user sees the error
      setResults([
        {
          uid: "batch",
          email: "—",
          status: "failed",
          error: msg,
        },
      ]);
      setSummary({ deleted: 0, failed: selectedIds.size, skipped: 0 });
      setStep("results");
    } finally {
      setDeleting(false);
      deletingRef.current = false;
    }
  }, [confirmMatches, selectedIds]);

  // ─── Retry failed ───────────────────────────────────────
  const failedUids = useMemo(
    () => results.filter((r) => r.status === "failed").map((r) => r.uid),
    [results]
  );

  const handleRetryFailed = useCallback(() => {
    if (failedUids.length === 0) return;
    setSelectedIds(new Set(failedUids));
    setConfirmText("");
    setStep("confirm");
  }, [failedUids]);

  // ─── Export failure list ────────────────────────────────
  const handleExportFailures = useCallback(async () => {
    const failures = results.filter((r) => r.status === "failed");
    if (failures.length === 0) return;
    const lines = failures.map(
      (f) => `${f.uid} | ${f.email} | ${f.error || "Unknown error"}`
    );
    const text = `Test Account Cleanup — Failed Accounts\n${"—".repeat(40)}\n${lines.join("\n")}`;
    try {
      await Share.share({ message: text });
    } catch {
      // Cancelled
    }
  }, [results]);

  // ─── Finish / Done ─────────────────────────────────────
  const handleDone = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // ─── Format date helper ────────────────────────────────
  const formatDate = (ts: any): string => {
    if (!ts) return "—";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // ─── Status badge ──────────────────────────────────────
  const statusBadge = (s: TestAccount["status"]) => {
    const config: Record<
      TestAccount["status"],
      { label: string; bg: string; fg: string }
    > = {
      active: { label: "Active", bg: "#E8F5E9", fg: SUCCESS_GREEN },
      incomplete: { label: "Incomplete Setup", bg: "#FFF8E1", fg: "#F57F17" },
      no_profile: { label: "No Profile", bg: "#FBE9E7", fg: "#D84315" },
      test: { label: "Test Account", bg: "#E3F2FD", fg: "#1565C0" },
    };
    const c = config[s];
    return (
      <View
        className="px-2 py-0.5 rounded-full"
        style={{ backgroundColor: c.bg }}
      >
        <Text
          className="text-xs"
          style={{ fontFamily: "SourceSans3_600SemiBold", color: c.fg }}
        >
          {c.label}
        </Text>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // STEP 1 — LIST
  // ═══════════════════════════════════════════════════════════
  if (step === "list") {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader
          title="Test Account Cleanup"
          showTitle
          onBack={onDismiss}
        />

        {/* Sticky search */}
        <View
          className="px-4 pt-3 pb-2 border-b"
          style={{ borderColor: BORDER_SOFT }}
        >
          <Text
            className="text-sm mb-2"
            style={{
              fontFamily: "SourceSans3_400Regular",
              color: TEXT_SECONDARY,
            }}
          >
            {"Review and remove test accounts created with @alanawaters.com."}
          </Text>
          <View className="flex-row items-center mb-2">
            <View
              className="flex-1 flex-row items-center px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
              }}
            >
              <Ionicons name="search" size={16} color={TEXT_MUTED} />
              <TextInput
                className="flex-1 ml-2 text-sm"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_PRIMARY_STRONG,
                }}
                placeholder="Search email, handle, UID..."
                placeholderTextColor={TEXT_MUTED}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
                </Pressable>
              )}
            </View>
            <Pressable
              className="ml-2 p-2 rounded-lg border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
              }}
              onPress={() => loadAccounts(true)}
            >
              <Ionicons name="refresh" size={18} color={TEXT_SECONDARY} />
            </Pressable>
          </View>

          {/* Select controls */}
          <View className="flex-row items-center">
            <Pressable
              className="flex-row items-center mr-4"
              onPress={allVisibleSelected ? clearSelection : selectAllVisible}
            >
              <Ionicons
                name={allVisibleSelected ? "checkbox" : "square-outline"}
                size={20}
                color={DEEP_FOREST}
              />
              <Text
                className="ml-1 text-xs"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_SECONDARY,
                }}
              >
                Select All Visible
              </Text>
            </Pressable>
            <Pressable
              className="flex-row items-center"
              onPress={allDomainSelected ? clearSelection : selectAllDomain}
            >
              <Ionicons
                name={allDomainSelected ? "checkbox" : "square-outline"}
                size={20}
                color={DEEP_FOREST}
              />
              <Text
                className="ml-1 text-xs"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_SECONDARY,
                }}
              >
                {"Select All Matching Domain"}
              </Text>
            </Pressable>
            <Text
              className="ml-auto text-xs"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: TEXT_MUTED,
              }}
            >
              {accounts.length} found
            </Text>
          </View>
        </View>

        {/* Account list */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={DEEP_FOREST} />
            <Text
              className="mt-3 text-sm"
              style={{
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_SECONDARY,
              }}
            >
              Loading accounts...
            </Text>
          </View>
        ) : filteredAccounts.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="checkmark-circle" size={48} color={SUCCESS_GREEN} />
            <Text
              className="mt-3 text-base text-center"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: TEXT_PRIMARY_STRONG,
              }}
            >
              {accounts.length === 0
                ? "No @alanawaters.com accounts found"
                : "No accounts match your search"}
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadAccounts(true)}
              />
            }
            contentContainerStyle={{
              paddingBottom: selectedIds.size > 0 ? 80 : 20,
            }}
          >
            {filteredAccounts.map((account) => {
              const isSelected = selectedIds.has(account.uid);
              return (
                <Pressable
                  key={account.uid}
                  className="flex-row items-center px-4 py-3 border-b"
                  style={{
                    borderColor: BORDER_SOFT,
                    backgroundColor: isSelected ? "#E8F5E920" : "transparent",
                  }}
                  onPress={() => toggleSelect(account.uid)}
                >
                  {/* Checkbox */}
                  <Ionicons
                    name={isSelected ? "checkbox" : "square-outline"}
                    size={22}
                    color={isSelected ? DEEP_FOREST : TEXT_MUTED}
                  />

                  {/* Avatar placeholder */}
                  <View
                    className="w-9 h-9 rounded-full items-center justify-center ml-3"
                    style={{
                      backgroundColor: DEEP_FOREST + "20",
                    }}
                  >
                    <Text
                      className="text-sm"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        color: DEEP_FOREST,
                      }}
                    >
                      {(
                        account.displayName?.[0] ||
                        account.email[0] ||
                        "?"
                      ).toUpperCase()}
                    </Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center mb-0.5">
                      <Text
                        className="text-sm mr-2"
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          color: TEXT_PRIMARY_STRONG,
                        }}
                        numberOfLines={1}
                      >
                        {account.displayName || "No Name"}
                      </Text>
                      {account.handle ? (
                        <Text
                          className="text-xs"
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            color: TEXT_MUTED,
                          }}
                          numberOfLines={1}
                        >
                          @{account.handle}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      className="text-xs mb-0.5"
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        color: TEXT_SECONDARY,
                      }}
                      numberOfLines={1}
                    >
                      {account.email}
                    </Text>
                    <View className="flex-row items-center flex-wrap">
                      <Text
                        className="text-xs mr-2"
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          color: TEXT_MUTED,
                        }}
                      >
                        Created {formatDate(account.createdAt)}
                      </Text>
                      <Text
                        className="text-xs mr-2"
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          color: TEXT_MUTED,
                        }}
                      >
                        {"\u00B7"} Active {formatDate(account.lastActiveAt)}
                      </Text>
                      {statusBadge(account.status)}
                    </View>
                    <View className="flex-row items-center mt-0.5">
                      <Text
                        className="text-xs mr-2"
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          color: TEXT_MUTED,
                        }}
                      >
                        {account.authProvider}
                      </Text>
                      <Text
                        className="text-xs"
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          color: TEXT_MUTED,
                        }}
                        numberOfLines={1}
                      >
                        {"\u00B7"} {account.uid}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Sticky selection bar */}
        {selectedIds.size > 0 && (
          <View
            className="absolute left-0 right-0 flex-row items-center justify-between px-4 py-3 border-t"
            style={{
              bottom: insets.bottom,
              backgroundColor: PARCHMENT,
              borderColor: BORDER_SOFT,
            }}
          >
            <Text
              className="text-sm"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: TEXT_PRIMARY_STRONG,
              }}
            >
              {selectedIds.size} account{selectedIds.size !== 1 ? "s" : ""}{" "}
              selected
            </Text>
            <View className="flex-row items-center">
              <Pressable
                className="px-3 py-2 rounded-lg mr-2"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
                onPress={clearSelection}
              >
                <Text
                  className="text-xs"
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: TEXT_SECONDARY,
                  }}
                >
                  Clear
                </Text>
              </Pressable>
              <Pressable
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: DANGER_RED }}
                onPress={handleStartDelete}
              >
                <Text
                  className="text-xs"
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  Delete Selected
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2 — CONFIRM
  // ═══════════════════════════════════════════════════════════
  if (step === "confirm") {
    return (
      <KeyboardAvoidingView
        className="flex-1"
        style={{ backgroundColor: PARCHMENT }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ModalHeader
          title="Confirm Account Removal"
          showTitle
          onBack={handleCancelConfirm}
        />

        <ScrollView
          className="flex-1 px-5"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Warning banner */}
          <View
            className="p-4 rounded-xl mt-4 mb-4"
            style={{ backgroundColor: DANGER_RED_BG }}
          >
            <View className="flex-row items-center mb-2">
              <Ionicons name="warning" size={20} color={DANGER_RED} />
              <Text
                className="ml-2 text-base"
                style={{
                  fontFamily: "Raleway_700Bold",
                  color: DANGER_RED,
                }}
              >
                Permanent Action
              </Text>
            </View>
            <Text
              className="text-sm leading-5"
              style={{
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
              }}
            >
              {`You are about to permanently remove ${selectedIds.size} account${selectedIds.size !== 1 ? "s" : ""} ending in ${TARGET_DOMAIN} from Firebase Authentication and application data.`}
            </Text>
          </View>

          {/* Deletion scope checklist */}
          <Text
            className="text-sm mb-2"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: TEXT_PRIMARY_STRONG,
            }}
          >
            The following will be deleted:
          </Text>
          {[
            "Firebase Authentication account",
            "Firestore user record",
            "Profile / campsite data",
            "Email subscriber record",
            "Push notification tokens",
            "Associated storage assets (avatars)",
          ].map((item) => (
            <View key={item} className="flex-row items-center mb-1.5 ml-1">
              <Ionicons name="close-circle" size={16} color={DANGER_RED} />
              <Text
                className="ml-2 text-sm"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_SECONDARY,
                }}
              >
                {item}
              </Text>
            </View>
          ))}

          {/* Preview list */}
          <Text
            className="text-sm mt-4 mb-2"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: TEXT_PRIMARY_STRONG,
            }}
          >
            Accounts to remove ({selectedAccounts.length}):
          </Text>
          <View
            className="rounded-xl border overflow-hidden mb-4"
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderColor: BORDER_SOFT,
            }}
          >
            {selectedAccounts.map((a, i) => (
              <View
                key={a.uid}
                className="px-3 py-2 border-b"
                style={{
                  borderColor:
                    i < selectedAccounts.length - 1 ? BORDER_SOFT : "transparent",
                }}
              >
                <Text
                  className="text-sm"
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                  numberOfLines={1}
                >
                  {a.handle ? `@${a.handle}` : a.displayName || "No Name"}
                </Text>
                <Text
                  className="text-xs"
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_SECONDARY,
                  }}
                  numberOfLines={1}
                >
                  {a.email}
                </Text>
                <Text
                  className="text-xs"
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_MUTED,
                  }}
                  numberOfLines={1}
                >
                  UID: {a.uid}
                </Text>
              </View>
            ))}
          </View>

          {/* Typed confirmation */}
          <Text
            className="text-sm mb-2"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: TEXT_PRIMARY_STRONG,
            }}
          >
            Type{" "}
            <Text style={{ color: DANGER_RED }}>{expectedConfirmText}</Text>{" "}
            to continue
          </Text>
          <TextInput
            className="px-4 py-3 rounded-xl border text-sm mb-4"
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderColor: confirmMatches ? SUCCESS_GREEN : BORDER_SOFT,
              fontFamily: "SourceSans3_600SemiBold",
              color: TEXT_PRIMARY_STRONG,
            }}
            placeholder={expectedConfirmText}
            placeholderTextColor={TEXT_MUTED}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </ScrollView>

        {/* Bottom actions */}
        <View
          className="px-5 pt-3 pb-3 border-t flex-row"
          style={{
            borderColor: BORDER_SOFT,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <Pressable
            className="flex-1 py-3 rounded-xl items-center mr-3 border"
            style={{
              borderColor: BORDER_SOFT,
              backgroundColor: CARD_BACKGROUND_LIGHT,
            }}
            onPress={handleCancelConfirm}
            disabled={deleting}
          >
            <Text
              className="text-sm"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: TEXT_SECONDARY,
              }}
            >
              Cancel
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 py-3 rounded-xl items-center"
            style={{
              backgroundColor:
                confirmMatches && !deleting ? DANGER_RED : DANGER_RED + "40",
            }}
            onPress={handleExecuteDelete}
            disabled={!confirmMatches || deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                className="text-sm"
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: "#FFFFFF",
                }}
              >
                {`Permanently Delete ${selectedIds.size} Account${selectedIds.size !== 1 ? "s" : ""}`}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 3 — RESULTS
  // ═══════════════════════════════════════════════════════════
  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader title="Accounts Removed" showTitle onBack={handleDone} />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Summary cards */}
        <View className="flex-row mt-4 mb-4">
          <View
            className="flex-1 p-4 rounded-xl mr-2"
            style={{ backgroundColor: "#E8F5E9" }}
          >
            <Text
              className="text-2xl mb-0.5"
              style={{
                fontFamily: "SourceSans3_700Bold",
                color: SUCCESS_GREEN,
              }}
            >
              {summary.deleted}
            </Text>
            <Text
              className="text-xs"
              style={{
                fontFamily: "SourceSans3_400Regular",
                color: SUCCESS_GREEN,
              }}
            >
              Deleted
            </Text>
          </View>
          <View
            className="flex-1 p-4 rounded-xl mr-2"
            style={{ backgroundColor: "#FBE9E7" }}
          >
            <Text
              className="text-2xl mb-0.5"
              style={{ fontFamily: "SourceSans3_700Bold", color: DANGER_RED }}
            >
              {summary.failed}
            </Text>
            <Text
              className="text-xs"
              style={{
                fontFamily: "SourceSans3_400Regular",
                color: DANGER_RED,
              }}
            >
              Failed
            </Text>
          </View>
          <View
            className="flex-1 p-4 rounded-xl"
            style={{ backgroundColor: "#FFF8E1" }}
          >
            <Text
              className="text-2xl mb-0.5"
              style={{ fontFamily: "SourceSans3_700Bold", color: "#F57F17" }}
            >
              {summary.skipped}
            </Text>
            <Text
              className="text-xs"
              style={{
                fontFamily: "SourceSans3_400Regular",
                color: "#F57F17",
              }}
            >
              Skipped
            </Text>
          </View>
        </View>

        {/* Per-account results */}
        <Text
          className="text-sm mb-2"
          style={{
            fontFamily: "SourceSans3_600SemiBold",
            color: TEXT_PRIMARY_STRONG,
          }}
        >
          Details
        </Text>
        <View
          className="rounded-xl border overflow-hidden mb-4"
          style={{
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderColor: BORDER_SOFT,
          }}
        >
          {results.map((r, i) => (
            <View
              key={`${r.uid}-${i}`}
              className="flex-row items-center px-3 py-2.5 border-b"
              style={{
                borderColor:
                  i < results.length - 1 ? BORDER_SOFT : "transparent",
              }}
            >
              <Ionicons
                name={
                  r.status === "deleted"
                    ? "checkmark-circle"
                    : r.status === "skipped"
                      ? "remove-circle"
                      : "close-circle"
                }
                size={18}
                color={
                  r.status === "deleted"
                    ? SUCCESS_GREEN
                    : r.status === "skipped"
                      ? "#F57F17"
                      : DANGER_RED
                }
              />
              <View className="flex-1 ml-2">
                <Text
                  className="text-sm"
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                  numberOfLines={1}
                >
                  {r.email}
                </Text>
                {r.error ? (
                  <Text
                    className="text-xs"
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      color: DANGER_RED,
                    }}
                    numberOfLines={2}
                  >
                    {r.error}
                  </Text>
                ) : null}
              </View>
              <Text
                className="text-xs ml-2"
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color:
                    r.status === "deleted"
                      ? SUCCESS_GREEN
                      : r.status === "skipped"
                        ? "#F57F17"
                        : DANGER_RED,
                }}
              >
                {r.status === "deleted"
                  ? "Deleted"
                  : r.status === "skipped"
                    ? "Skipped"
                    : "Failed"}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View
        className="px-5 pt-3 pb-3 border-t"
        style={{
          borderColor: BORDER_SOFT,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <Pressable
          className="py-3 rounded-xl items-center mb-2"
          style={{ backgroundColor: DEEP_FOREST }}
          onPress={handleDone}
        >
          <Text
            className="text-sm"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: "#FFFFFF" }}
          >
            Done
          </Text>
        </Pressable>

        {failedUids.length > 0 && (
          <View className="flex-row">
            <Pressable
              className="flex-1 py-3 rounded-xl items-center mr-2 border"
              style={{
                borderColor: DANGER_RED,
                backgroundColor: "transparent",
              }}
              onPress={handleRetryFailed}
            >
              <Text
                className="text-sm"
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: DANGER_RED,
                }}
              >
                Retry Failed ({failedUids.length})
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 py-3 rounded-xl items-center border"
              style={{
                borderColor: BORDER_SOFT,
                backgroundColor: CARD_BACKGROUND_LIGHT,
              }}
              onPress={handleExportFailures}
            >
              <Text
                className="text-sm"
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: TEXT_SECONDARY,
                }}
              >
                Export Failures
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
