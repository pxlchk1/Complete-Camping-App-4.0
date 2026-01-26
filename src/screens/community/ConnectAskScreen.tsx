import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, TextInput, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { RootStackNavigationProp } from "../../navigation/types";
import { getQuestions, type Question } from "../../api/qa-service";
import { useAuthStore } from "../../state/authStore";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import { requireAccount } from "../../utils/gating";
import { useToast } from "../../components/ToastManager";
import { DEEP_FOREST, PARCHMENT, CARD_BACKGROUND_LIGHT, BORDER_SOFT, TEXT_PRIMARY_STRONG, TEXT_SECONDARY, TEXT_MUTED } from "../../constants/colors";

export default function ConnectAskScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      setLoading(true);
      const fetchedQuestions = await getQuestions();
      setQuestions(fetchedQuestions);
    } catch (error: any) {
      console.error("Firestore error loading questions:", error);
      showError("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [user, showError]);

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user, load]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        load();
      }
    }, [user, load])
  );

  const filteredQuestions = (searchQuery.trim()
    ? questions.filter(
        (q) =>
          q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.details.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : questions).filter((q) => (q.score || 0) > -5); // Hide items with score less than -5

  return (
    <View className="flex-1">
      {/* Top Navigation Bar */}
      <View className="bg-forest" style={{ paddingVertical: 12 }}>
        <View className="flex-row items-center" style={{ paddingHorizontal: 16, minHeight: 44 }}>
          <Text className="text-xl font-bold text-parchment" style={{ fontFamily: "Raleway_700Bold" }}>
            Ask a Camper
          </Text>
          <View className="flex-1 ml-3 mr-3">
            <View className="flex-row items-center bg-parchment rounded-xl px-4 py-2">
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="search questions"
                placeholderTextColor="#9ca3af"
                className="flex-1 ml-2 text-forest-800 text-base"
                style={{ fontFamily: "SourceSans3_400Regular" }}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}> 
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </Pressable>
              )}
            </View>
          </View>
          <Pressable
            onPress={() => {
              // Questions only require an account, not PRO
              const canProceed = requireAccount({
                openAccountModal: () => setShowLoginModal(true),
              });
              if (!canProceed) return;
              
              navigation.navigate("CreateQuestion");
            }}
            className="active:opacity-70"
          >
            <Ionicons name="add-circle" size={28} color={PARCHMENT} />
          </Pressable>
        </View>
      </View>

      <View className="px-4 mt-4">
        {loading ? (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" color={DEEP_FOREST} />
            <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>Loading questions...</Text>
          </View>
        ) : filteredQuestions.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Ionicons name="chatbubble-ellipses-outline" size={64} color="#9ca3af" />
            <Text className="mt-4 text-base" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
              {searchQuery.trim() ? "No matching questions" : "No questions yet"}
            </Text>
            <Text className="mt-2 text-center px-8" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
              {searchQuery.trim()
                ? "Try adjusting your search"
                : "Be the first to ask a question!"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredQuestions}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate("ThreadDetail", { questionId: item.id })}
                className="rounded-xl p-4 border mb-3 active:opacity-70"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
              >
                {/* Question */}
                <Text className="text-base mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
                  {item.question}
                </Text>

                {/* Details Preview */}
                <Text className="text-sm mb-3" numberOfLines={2} style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                  {item.details}
                </Text>

                {/* Footer: author, date */}
                <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderColor: BORDER_SOFT }}>
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12, color: TEXT_MUTED }}>
                    {item.userId}
                  </Text>
                  <Text style={{ marginHorizontal: 6, opacity: 0.7, color: TEXT_MUTED }}>•</Text>
                  <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_MUTED }}>
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : ""}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
      <AccountRequiredModal
        visible={showLoginModal}
        onCreateAccount={() => {
          setShowLoginModal(false);
          navigation.navigate("Auth");
        }}
        onMaybeLater={() => setShowLoginModal(false)}
      />
    </View>
  );
}
