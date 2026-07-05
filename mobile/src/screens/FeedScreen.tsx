// Лента — посты с сервера, лайки, создание текстового поста.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, PostItem } from '../api';
import { Palette } from '../theme';
import { Avatar, timeAgo } from '../ui';

export default function FeedScreen({ p }: { p: Palette }) {
  const [posts, setPosts] = useState<PostItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setPosts(await api.feed('all'));
    } catch {
      setPosts((old) => old ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function publish() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const post = await api.createPost({ text: t });
      setPosts((old) => [post, ...(old ?? [])]);
      setText('');
    } catch {
      // оставляем текст в поле — можно повторить
    } finally {
      setSending(false);
    }
  }

  async function like(post: PostItem) {
    // оптимистично меняем сразу, сервер подтвердит
    setPosts((old) =>
      (old ?? []).map((x) =>
        x.id === post.id
          ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) }
          : x,
      ),
    );
    try {
      const r = await api.likePost(post.id);
      setPosts((old) =>
        (old ?? []).map((x) =>
          x.id === post.id ? { ...x, liked: r.liked, likeCount: r.likeCount } : x,
        ),
      );
    } catch {
      load();
    }
  }

  const s = styles(p);

  if (!posts) {
    return (
      <View style={[s.center, { backgroundColor: p.bg }]}>
        <ActivityIndicator color={p.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <FlatList
        data={posts}
        keyExtractor={(x) => String(x.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={p.accent} />
        }
        contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        ListHeaderComponent={
          <View style={s.composer}>
            <TextInput
              style={s.composerInput}
              value={text}
              onChangeText={setText}
              placeholder="Что нового?"
              placeholderTextColor={p.text3}
              multiline
            />
            <Pressable
              style={[s.composerBtn, (!text.trim() || sending) && { opacity: 0.45 }]}
              onPress={publish}
            >
              <Text style={s.composerBtnText}>{sending ? '…' : 'Опубликовать'}</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <Text style={s.empty}>Пока пусто — напишите первый пост!</Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.head}>
              <Avatar
                avatar={item.author?.avatar}
                color={item.author?.color || '#888'}
                letter={item.author?.letter || '?'}
                size={40}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.author}>{item.author?.name || 'Пользователь'}</Text>
                <Text style={s.when}>
                  @{item.author?.handle} · {timeAgo(item.createdAt)}
                </Text>
              </View>
            </View>
            {!!item.text && <Text style={s.text}>{item.text}</Text>}
            {!!item.image && <Image source={{ uri: item.image }} style={s.img} />}
            <View style={s.actions}>
              <Pressable style={s.action} onPress={() => like(item)}>
                <Text style={[s.actionText, item.liked && { color: p.accent }]}>
                  {item.liked ? '♥' : '♡'} {item.likeCount}
                </Text>
              </Pressable>
              <Text style={s.actionText}>💬 {item.commentCount}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = (p: Palette) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    composer: {
      backgroundColor: p.card,
      borderRadius: 16,
      padding: 12,
      marginBottom: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
    },
    composerInput: { minHeight: 44, fontSize: 16, color: p.text, paddingTop: 6 },
    composerBtn: {
      alignSelf: 'flex-end',
      backgroundColor: p.accent,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 9,
      marginTop: 6,
    },
    composerBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    empty: { textAlign: 'center', color: p.text3, marginTop: 40, fontSize: 15 },
    card: {
      backgroundColor: p.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
    },
    head: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    author: { fontSize: 15, fontWeight: '700', color: p.text },
    when: { fontSize: 13, color: p.text3, marginTop: 1 },
    text: { fontSize: 15.5, color: p.text, lineHeight: 22 },
    img: { width: '100%', height: 260, borderRadius: 12, marginTop: 10 },
    actions: { flexDirection: 'row', gap: 22, marginTop: 12 },
    action: { flexDirection: 'row', alignItems: 'center' },
    actionText: { fontSize: 15, color: p.text2, fontWeight: '600' },
  });
