// Список чатов: личные + группы, с последним сообщением и счётчиком непрочитанных.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, ChatListItem, GroupListItem } from '../api';
import { Palette } from '../theme';
import { Avatar, timeAgo } from '../ui';

export type ChatTarget =
  | { kind: 'dm'; userId: number; title: string }
  | { kind: 'group'; groupId: number; title: string };

type Row =
  | { type: 'dm'; item: ChatListItem; at: number }
  | { type: 'group'; item: GroupListItem; at: number };

export default function ChatsScreen({
  p,
  onOpen,
}: {
  p: Palette;
  onOpen: (t: ChatTarget) => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [chats, groups] = await Promise.all([api.chatList(), api.groupList()]);
      const list: Row[] = [
        ...chats.map((c): Row => ({
          type: 'dm',
          item: c,
          at: c.last ? Date.parse(c.last.createdAt) : 0,
        })),
        ...groups.map((g): Row => ({
          type: 'group',
          item: g,
          at: g.last ? Date.parse(g.last.createdAt) : 0,
        })),
      ].sort((a, b) => b.at - a.at);
      setRows(list);
    } catch {
      setRows((old) => old ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 12000); // как на сайте — лёгкий поллинг
    return () => clearInterval(t);
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const s = styles(p);

  if (!rows) {
    return (
      <View style={[s.center, { backgroundColor: p.bg }]}>
        <ActivityIndicator color={p.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.type}-${r.type === 'dm' ? r.item.user.id : r.item.id}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={p.accent} />
        }
        ListEmptyComponent={
          <Text style={s.empty}>Чатов пока нет — найдите друзей на сайте или в поиске.</Text>
        }
        renderItem={({ item: r }) => {
          const title = r.type === 'dm' ? r.item.user.name : r.item.name;
          const last = r.item.last;
          const preview = last
            ? `${last.fromMe ? 'Вы: ' : r.type === 'group' && 'author' in last ? `${last.author}: ` : ''}${last.text}`
            : r.type === 'group'
              ? `Участников: ${r.item.memberCount}`
              : 'Нет сообщений';
          return (
            <Pressable
              style={({ pressed }) => [s.row, pressed && { backgroundColor: p.bg2 }]}
              onPress={() =>
                onOpen(
                  r.type === 'dm'
                    ? { kind: 'dm', userId: r.item.user.id, title }
                    : { kind: 'group', groupId: r.item.id, title },
                )
              }
            >
              {r.type === 'dm' ? (
                <Avatar
                  avatar={r.item.user.avatar}
                  color={r.item.user.color}
                  letter={r.item.user.letter}
                  size={50}
                />
              ) : (
                <Avatar color={r.item.color} letter={r.item.letter} size={50} />
              )}
              <View style={s.mid}>
                <Text style={s.name} numberOfLines={1}>
                  {r.type === 'group' ? '👥 ' : ''}
                  {title}
                </Text>
                <Text style={s.preview} numberOfLines={1}>
                  {preview}
                </Text>
              </View>
              <View style={s.right}>
                {!!last && <Text style={s.when}>{timeAgo(last.createdAt)}</Text>}
                {r.item.unread > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>
                      {r.item.unread > 99 ? '99+' : r.item.unread}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = (p: Palette) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: {
      textAlign: 'center',
      color: p.text3,
      marginTop: 60,
      fontSize: 15,
      paddingHorizontal: 30,
      lineHeight: 22,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    mid: { flex: 1, marginLeft: 12 },
    name: { fontSize: 16, fontWeight: '700', color: p.text },
    preview: { fontSize: 14, color: p.text2, marginTop: 2 },
    right: { alignItems: 'flex-end', gap: 6 },
    when: { fontSize: 12, color: p.text3 },
    badge: {
      backgroundColor: p.accent,
      borderRadius: 11,
      minWidth: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  });
