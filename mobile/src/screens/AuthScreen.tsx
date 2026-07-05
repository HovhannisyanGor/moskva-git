// Экран входа/регистрации — нативный, в стиле Localee.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, ApiUser, ApiError } from '../api';
import { Palette } from '../theme';

export default function AuthScreen({
  p,
  onAuthed,
}: {
  p: Palette;
  onAuthed: (u: ApiUser) => void;
}) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const user =
        tab === 'login'
          ? await api.login({ email: email.trim(), password })
          : await api.register({
              name: name.trim(),
              handle: handle.trim(),
              email: email.trim(),
              password,
            });
      onAuthed(user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Что-то пошло не так');
    } finally {
      setBusy(false);
    }
  }

  const s = styles(p);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.wrap}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image source={require('../../assets/logo.png')} style={s.logo} />
        <Text style={s.brand}>Localee</Text>
        <Text style={s.tagline}>исследуй город умно</Text>

        <View style={s.tabs}>
          {(
            [
              ['login', 'Вход'],
              ['register', 'Регистрация'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              style={[s.tab, tab === key && s.tabActive]}
              onPress={() => {
                setTab(key);
                setError('');
              }}
            >
              <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'register' && (
          <>
            <Text style={s.label}>ИМЯ</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Как вас зовут"
              placeholderTextColor={p.text3}
            />
            <Text style={s.label}>НИК (ЛАТИНИЦА)</Text>
            <TextInput
              style={s.input}
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="nickname"
              placeholderTextColor={p.text3}
            />
          </>
        )}

        <Text style={s.label}>EMAIL</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={p.text3}
        />
        <Text style={s.label}>ПАРОЛЬ</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={p.text3}
        />

        <Pressable style={({ pressed }) => [s.submit, pressed && { opacity: 0.8 }]} onPress={submit}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitText}>{tab === 'login' ? 'Войти' : 'Создать аккаунт'}</Text>
          )}
        </Pressable>

        {!!error && <Text style={s.error}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (p: Palette) =>
  StyleSheet.create({
    wrap: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 48 },
    logo: { width: 84, height: 84, alignSelf: 'center', borderRadius: 20 },
    brand: {
      fontSize: 28,
      fontWeight: '800',
      color: p.text,
      textAlign: 'center',
      marginTop: 10,
    },
    tagline: { fontSize: 15, color: p.text2, textAlign: 'center', marginBottom: 28, marginTop: 2 },
    tabs: {
      flexDirection: 'row',
      backgroundColor: p.bg2,
      borderRadius: 14,
      padding: 4,
      marginBottom: 20,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
    tabActive: { backgroundColor: p.accent },
    tabText: { fontSize: 15, fontWeight: '600', color: p.text2 },
    tabTextActive: { color: '#fff' },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: p.text3,
      letterSpacing: 0.8,
      marginBottom: 6,
      marginLeft: 4,
    },
    input: {
      backgroundColor: p.inputBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
      color: p.text,
      marginBottom: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
    },
    submit: {
      backgroundColor: p.accent,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 6,
    },
    submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    error: { color: p.accent, textAlign: 'center', marginTop: 14, fontSize: 14 },
  });
