// Localee — мобильное приложение (React Native + Expo).
// Данные — с того же сервера, что у сайта: https://api.localee.ru
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View, useColorScheme } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api, ApiUser, loadToken } from './src/api';
import { DARK, LIGHT } from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import MapScreen from './src/screens/MapScreen';
import FeedScreen from './src/screens/FeedScreen';
import ChatsScreen, { ChatTarget } from './src/screens/ChatsScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';

type RootParams = {
  Tabs: undefined;
  Chat: { target: ChatTarget };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootParams>();

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return <Text style={{ fontSize: focused ? 24 : 22, color }}>{label}</Text>;
}

export default function App() {
  const scheme = useColorScheme();
  const p = scheme === 'dark' ? DARK : LIGHT;
  const [user, setUser] = useState<ApiUser | null>(null);
  const [booting, setBooting] = useState(true);

  // При старте: если токен сохранён — тихо входим.
  useEffect(() => {
    (async () => {
      try {
        const t = await loadToken();
        if (t) setUser(await api.me());
      } catch {
        // токен протух — покажем экран входа
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  if (booting) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg }}
      >
        <ActivityIndicator size="large" color={p.accent} />
      </View>
    );
  }

  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  function Tabs() {
    return (
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: p.bg },
          headerTitleStyle: { color: p.text, fontWeight: '800' },
          headerShadowVisible: false,
          tabBarStyle: { backgroundColor: p.bg, borderTopColor: p.border },
          tabBarActiveTintColor: p.accent,
          tabBarInactiveTintColor: p.text3,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="MapTab"
          options={{
            title: 'Карта',
            headerShown: false,
            tabBarIcon: (pr) => <TabIcon label="🗺️" {...pr} />,
          }}
        >
          {() => <MapScreen p={p} />}
        </Tab.Screen>
        <Tab.Screen
          name="FeedTab"
          options={{ title: 'Лента', tabBarIcon: (pr) => <TabIcon label="📰" {...pr} /> }}
        >
          {() => <FeedScreen p={p} />}
        </Tab.Screen>
        <Tab.Screen
          name="ChatsTab"
          options={{ title: 'Чаты', tabBarIcon: (pr) => <TabIcon label="💬" {...pr} /> }}
        >
          {({ navigation }) => (
            <ChatsScreen
              p={p}
              onOpen={(target) => navigation.getParent()?.navigate('Chat', { target })}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="ProfileTab"
          options={{ title: 'Профиль', tabBarIcon: (pr) => <TabIcon label="👤" {...pr} /> }}
        >
          {() => user && <ProfileScreen p={p} user={user} onLogout={() => setUser(null)} />}
        </Tab.Screen>
      </Tab.Navigator>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {!user ? (
        <AuthScreen p={p} onAuthed={setUser} />
      ) : (
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator>
            <Stack.Screen name="Tabs" options={{ headerShown: false }} component={Tabs} />
            <Stack.Screen
              name="Chat"
              options={({ route }) => ({
                title: route.params.target.title,
                headerStyle: { backgroundColor: p.bg },
                headerTitleStyle: { color: p.text, fontWeight: '700' },
                headerTintColor: p.accent,
                headerBackTitle: 'Назад',
              })}
            >
              {({ route }) => <ChatScreen p={p} target={route.params.target} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
