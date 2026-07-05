// Профиль: обложка, аватар, данные, выход из аккаунта.
import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, ApiUser } from '../api';
import { Palette } from '../theme';
import { Avatar } from '../ui';

export default function ProfileScreen({
  p,
  user,
  onLogout,
}: {
  p: Palette;
  user: ApiUser;
  onLogout: () => void;
}) {
  function confirmLogout() {
    Alert.alert('Выйти из аккаунта?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await api.logout();
          onLogout();
        },
      },
    ]);
  }

  const s = styles(p);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.bg }}>
      {user.cover ? (
        <Image source={{ uri: user.cover }} style={s.cover} />
      ) : (
        <View style={[s.cover, { backgroundColor: user.color || p.bg2 }]} />
      )}
      <View style={s.avatarWrap}>
        <Avatar avatar={user.avatar} color={user.color} letter={user.letter} size={96} />
      </View>
      <View style={s.body}>
        <Text style={s.name}>{user.name}</Text>
        <Text style={s.handle}>@{user.handle}</Text>
        {!!user.bio && <Text style={s.bio}>{user.bio}</Text>}
        {!!user.city && <Text style={s.city}>📍 {user.city}</Text>}

        <View style={s.infoCard}>
          <Row p={p} label="Email" value={user.email} />
          <Row p={p} label="Роль" value={user.role === 'admin' ? 'Администратор' : 'Пользователь'} />
          <Row
            p={p}
            label="В Localee с"
            value={new Date(user.created_at.replace(' ', 'T')).toLocaleDateString('ru-RU', {
              month: 'long',
              year: 'numeric',
            })}
            last
          />
        </View>

        <Pressable style={s.logout} onPress={confirmLogout}>
          <Text style={s.logoutText}>Выйти из аккаунта</Text>
        </Pressable>
        <Text style={s.note}>
          Редактирование профиля, друзья и настройки — скоро в приложении.{'\n'}Пока это можно
          делать на localee.ru
        </Text>
      </View>
    </ScrollView>
  );
}

function Row({
  p,
  label,
  value,
  last,
}: {
  p: Palette;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: p.border,
      }}
    >
      <Text style={{ color: p.text2, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: p.text, fontSize: 15, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = (p: Palette) =>
  StyleSheet.create({
    cover: { width: '100%', height: 140 },
    avatarWrap: {
      marginTop: -48,
      marginLeft: 20,
      alignSelf: 'flex-start',
      borderWidth: 4,
      borderColor: p.bg,
      borderRadius: 52,
    },
    body: { padding: 20, paddingTop: 10 },
    name: { fontSize: 24, fontWeight: '800', color: p.text },
    handle: { fontSize: 15, color: p.text3, marginTop: 2 },
    bio: { fontSize: 15, color: p.text2, marginTop: 10, lineHeight: 21 },
    city: { fontSize: 14, color: p.text2, marginTop: 8 },
    infoCard: {
      backgroundColor: p.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      marginTop: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
    },
    logout: {
      marginTop: 24,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: p.bg2,
      borderWidth: 1,
      borderColor: p.accent,
    },
    logoutText: { color: p.accent, fontSize: 16, fontWeight: '700' },
    note: {
      textAlign: 'center',
      color: p.text3,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 18,
    },
  });
