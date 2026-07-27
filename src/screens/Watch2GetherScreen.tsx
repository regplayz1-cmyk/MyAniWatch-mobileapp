import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { COLORS } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { apiGetW2GRooms, apiCreateW2GRoom, apiGetW2GRoomDetails, apiSendW2GChat } from "../services/api";
import { Tv, Plus, Users, Send, ChevronLeft, MessageSquare } from "lucide-react-native";

export default function Watch2GetherScreen() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<any | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  const loadRooms = async () => {
    try {
      setLoading(true);
      const res = await apiGetW2GRooms();
      setRooms(res.rooms || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // Poll active room chat
  useEffect(() => {
    if (!activeRoom?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiGetW2GRoomDetails(activeRoom.id);
        if (res?.room) setActiveRoom(res.room);
      } catch {
        // Ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeRoom?.id]);

  const handleCreateRoom = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a room.");
      return;
    }
    try {
      const res = await apiCreateW2GRoom({
        hostId: user.id,
        hostName: user.username,
        hostAvatar: user.avatar,
        name: newRoomName || `${user.username}'s Room`,
        animeId: "21",
        animeTitle: "One Piece",
      });
      setShowCreateModal(false);
      setNewRoomName("");
      if (res.room) {
        setActiveRoom(res.room);
        loadRooms();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create room");
    }
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim() || !activeRoom?.id || !user) return;
    try {
      const text = chatMessage;
      setChatMessage("");
      await apiSendW2GChat(activeRoom.id, user.username, text);
    } catch {
      // Ignore
    }
  };

  // Inside Active Room View
  if (activeRoom) {
    return (
      <View style={styles.container}>
        <View style={styles.roomHeader}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setActiveRoom(null)}>
            <ChevronLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.roomHeaderTitle} numberOfLines={1}>{activeRoom.name}</Text>
            <Text style={styles.roomHeaderSub}>{activeRoom.animeTitle} • Ep {activeRoom.episodeNumber}</Text>
          </View>
        </View>

        {/* Live Chat Section */}
        <View style={styles.chatSection}>
          <Text style={styles.chatTitle}>Live Room Chat</Text>
          <FlatList
            data={activeRoom.chatMessages || []}
            keyExtractor={(item) => item.id || String(Math.random())}
            contentContainerStyle={styles.chatList}
            renderItem={({ item }) => (
              <View style={styles.chatBubble}>
                <Text style={styles.chatSender}>{item.sender}</Text>
                <Text style={styles.chatText}>{item.text}</Text>
              </View>
            )}
          />

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Send message to room..."
              placeholderTextColor={COLORS.textDark}
              value={chatMessage}
              onChangeText={setChatMessage}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendChat}>
              <Send size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Room Selection View
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Watch Together</Text>
          <Text style={styles.headerSub}>Watch anime in sync with friends</Text>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
          <Plus size={18} color={COLORS.text} />
          <Text style={styles.createBtnText}>Create Room</Text>
        </TouchableOpacity>
      </View>

      {showCreateModal && (
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Create Watch Party</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Room Name (e.g. Anime Night)"
            placeholderTextColor={COLORS.textDark}
            value={newRoomName}
            onChangeText={setNewRoomName}
          />
          <View style={styles.modalBtnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleCreateRoom}>
              <Text style={styles.confirmBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : rooms.length === 0 ? (
        <View style={styles.emptyState}>
          <Tv size={40} color={COLORS.textDark} />
          <Text style={styles.emptyTitle}>No Active Public Rooms</Text>
          <Text style={styles.emptySubtitle}>Be the first to host a Watch Together room!</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.roomCard} onPress={() => setActiveRoom(item)}>
              <View style={styles.roomCardHeader}>
                <Text style={styles.roomCardTitle}>{item.name}</Text>
                <View style={styles.memberBadge}>
                  <Users size={12} color={COLORS.secondary} />
                  <Text style={styles.memberText}>{item.members?.length || 1}</Text>
                </View>
              </View>

              <Text style={styles.roomCardAnime}>{item.animeTitle} • Ep {item.episodeNumber}</Text>
              <Text style={styles.roomHost}>Host: {item.hostName}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createBtnText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 13,
  },
  modalCard: {
    margin: 16,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: COLORS.text,
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontWeight: "700",
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: COLORS.text,
    fontWeight: "800",
  },
  listContent: {
    padding: 16,
  },
  roomCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  roomCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  roomCardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,229,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  memberText: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: "800",
  },
  roomCardAnime: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  roomHost: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  roomHeaderTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  roomHeaderSub: {
    color: COLORS.primary,
    fontSize: 12,
  },
  chatSection: {
    flex: 1,
    padding: 16,
  },
  chatTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  chatList: {
    paddingBottom: 16,
  },
  chatBubble: {
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  chatSender: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
  },
  chatText: {
    color: COLORS.text,
    fontSize: 13,
  },
  chatInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
