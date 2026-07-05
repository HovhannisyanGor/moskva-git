// Переписка (личная или групповая): пузыри сообщений, отправка, поллинг.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ChatMessageItem, GroupMessageItem } from '../api';
import { Palette } from '../theme';
import { clockTime } from '../ui';
import type { ChatTarget } from './ChatsScreen';

type Msg = ChatMessageItem | GroupMessageItem;

export default function ChatScreen({ p, target }: { p: Palette; target: ChatTarget }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      if (target.kind === 'dm') {
        const r = await api.chatMessages(target.userId);
        setMessages(r.messages);
      } else {
        const r = await api.groupMessages(target.groupId);
        setMessages(r.messages);
      }
    } catch {
      setMessages((old) => old ?? []);
    }
  }, [target]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const msg =
        target.kind === 'dm'
          ? await api.sendMessage(target.userId, t)
          : await api.sendGroupMessage(target.groupId, t);
      setMessages((old) => [...(old ?? []), msg]);
      setText('');
    } catch {
      // текст остаётся в поле
    } finally {
      setSending(false);
    }
  }

  const s = styles(p);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {!messages ? (
        <View style={s.center}>
          <ActivityIndicator color={p.accent} size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item: m }) => {
            const sender = 'sender' in m ? m.sender : null;
            return (
              <View style={[s.msgRow, m.fromMe ? s.rowMe : s.rowOther]}>
                <View style={[s.bubble, m.fromMe ? s.bubbleMe : s.bubbleOther]}>
                  {!m.fromMe && sender && (
                    <Text style={[s.senderName, { color: sender.color || p.accent }]}>
                      {sender.name}
                    </Text>
                  )}
                  {!!m.forwardedFrom && (
                    <Text style={s.fwd}>Переслано от {m.forwardedFrom}</Text>
                  )}
                  {!!m.replyTo && (
                    <View style={s.reply}>
                      <Text style={s.replyText} numberOfLines={1}>
                        {m.replyTo.text}
                      </Text>
                    </View>
                  )}
                  <Text style={[s.msgText, m.fromMe && { color: '#fff' }]}>{m.text}</Text>
                  <Text style={[s.msgWhen, m.fromMe && { color: 'rgba(255,255,255,0.7)' }]}>
                    {clockTime(m.createdAt)}
                    {m.edited ? ' · изменено' : ''}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Сообщение…"
          placeholderTextColor={p.text3}
          multiline
        />
        <Pressable
          style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
          onPress={send}
        >
          <Text style={s.sendIcon}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (p: Palette) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    msgRow: { marginBottom: 8, flexDirection: 'row' },
    rowMe: { justifyContent: 'flex-end' },
    rowOther: { justifyContent: 'flex-start' },
    bubble: {
      maxWidth: '80%',
      borderRadius: 18,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    bubbleMe: { backgroundColor: p.accent, borderBottomRightRadius: 6 },
    bubbleOther: {
      backgroundColor: p.card,
      borderBottomLeftRadius: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
    },
    senderName: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
    fwd: { fontSize: 12, fontStyle: 'italic', color: p.text3, marginBottom: 3 },
    reply: {
      borderLeftWidth: 3,
      borderLeftColor: p.accent,
      paddingLeft: 8,
      marginBottom: 5,
      opacity: 0.8,
    },
    replyText: { fontSize: 13, color: p.text2 },
    msgText: { fontSize: 15.5, color: p.text, lineHeight: 21 },
    msgWhen: { fontSize: 11, color: p.text3, marginTop: 3, alignSelf: 'flex-end' },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 10,
      paddingTop: 8,
      backgroundColor: p.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: p.inputBg,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingTop: 10,
      paddingBottom: 10,
      fontSize: 16,
      color: p.text,
      maxHeight: 110,
    },
    sendBtn: {
      backgroundColor: p.accent,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendIcon: { color: '#fff', fontSize: 17, marginLeft: 2 },
  });
