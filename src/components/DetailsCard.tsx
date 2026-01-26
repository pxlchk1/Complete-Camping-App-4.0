import React from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type DetailsLink = {
  id: string;
  title: string;
  url: string;
  source: "alltrails" | "onx" | "gaia" | "google_maps" | "other";
};

interface DetailsCardProps {
  notes: string;
  links: DetailsLink[];
  onEditNotes: () => void;
  onAddLink: () => void;
  onDeleteLink: (id: string) => void;
  onOpenLink: (url: string) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  alltrails: "AllTrails",
  onx: "onX",
  gaia: "Gaia",
  google_maps: "Google Maps",
  other: "Link",
};

export default function DetailsCard({ notes, links, onEditNotes, onAddLink, onDeleteLink, onOpenLink }: DetailsCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>Details</Text>
      {/* Notes Section */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionHeader}>Notes</Text>
          <Pressable onPress={onEditNotes} style={styles.editBtn} accessibilityLabel="Edit notes">
            <Ionicons name="create-outline" size={18} color="#3D2817" />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>
        <Pressable onPress={onEditNotes} style={styles.notesArea} accessibilityLabel="Edit notes">
          <Text style={[styles.notesText, !notes && styles.placeholder]}>
            {notes ? notes : "Add notes (day-by-day plans, reminders, permit info…)"}
          </Text>
        </Pressable>
      </View>
      {/* Links Section */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionHeader}>Links</Text>
          <Pressable onPress={onAddLink} style={styles.addBtn} accessibilityLabel="Add link">
            <Ionicons name="add-circle-outline" size={18} color="#3D2817" />
            <Text style={styles.addText}>Add link</Text>
          </Pressable>
        </View>
        {links.length === 0 ? (
          <Text style={styles.placeholder}>Add a link to a hike, route, permit page, or map.</Text>
        ) : (
          <FlatList
            data={links}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Pressable style={styles.linkRow} onPress={() => onOpenLink(item.url)} accessibilityLabel={`Open link: ${item.title}`}>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkTitle}>{item.title}</Text>
                  <View style={styles.chip}><Text style={styles.chipText}>{SOURCE_LABELS[item.source]}</Text></View>
                </View>
                <View style={styles.linkActions}>
                  <Ionicons name="open-outline" size={18} color="#3D2817" style={{ marginRight: 8 }} />
                  <Pressable onPress={() => onDeleteLink(item.id)} accessibilityLabel="Delete link">
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  </Pressable>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: "#E5D6C2",
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3D2817",
    marginBottom: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3D2817",
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  editText: {
    color: "#3D2817",
    fontSize: 13,
    marginLeft: 3,
    fontWeight: "500",
  },
  notesArea: {
    minHeight: 40,
    paddingVertical: 6,
  },
  notesText: {
    color: "#3D2817",
    fontSize: 14,
  },
  placeholder: {
    color: "#bfae9b",
    fontStyle: "italic",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  addText: {
    color: "#3D2817",
    fontSize: 13,
    marginLeft: 3,
    fontWeight: "500",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#f2e6d8",
  },
  linkInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  linkTitle: {
    color: "#3D2817",
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
  },
  chip: {
    backgroundColor: "#f2e6d8",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 4,
  },
  chipText: {
    color: "#3D2817",
    fontSize: 12,
    fontWeight: "500",
  },
  linkActions: {
    flexDirection: "row",
    alignItems: "center",
  },
});
