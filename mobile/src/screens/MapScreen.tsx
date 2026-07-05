// Карта — нативная (Apple Maps на iOS, Google на Android) с местами Localee.
import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_COLORS, CATEGORY_LABELS, PLACES, Place } from '../data/places';
import { Palette } from '../theme';

const MOSCOW = {
  latitude: 55.7558,
  longitude: 37.6173,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

export default function MapScreen({ p }: { p: Palette }) {
  const insets = useSafeAreaInsets();
  const [show18, setShow18] = useState(false);
  const [ageAsk, setAgeAsk] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);

  const places = useMemo(
    () => (show18 ? PLACES : PLACES.filter((x) => x.category !== 'nightlife')),
    [show18],
  );

  function toggle18() {
    if (show18) return setShow18(false);
    setAgeAsk(true);
  }

  const s = styles(p);
  return (
    <View style={{ flex: 1 }}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={MOSCOW}>
        {places.map((pl) => (
          <Marker
            key={pl.id}
            coordinate={{ latitude: pl.coords[0], longitude: pl.coords[1] }}
            pinColor={CATEGORY_COLORS[pl.category]}
            onPress={() => setPlace(pl)}
          />
        ))}
      </MapView>

      {/* Кнопка 18+ */}
      <Pressable
        style={[s.btn18, { top: insets.top + 10 }, show18 && s.btn18on]}
        onPress={toggle18}
      >
        <Text style={[s.btn18text, show18 && { color: '#fff' }]}>18+</Text>
      </Pressable>

      {/* Возрастной гейт */}
      <Modal visible={ageAsk} transparent animationType="fade">
        <View style={s.modalBack}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Вам есть 18 лет?</Text>
            <Text style={s.modalText}>
              Раздел показывает бары, клубы и кальянные — контент для взрослых.
            </Text>
            <Pressable
              style={s.modalMain}
              onPress={() => {
                setShow18(true);
                setAgeAsk(false);
              }}
            >
              <Text style={s.modalMainText}>Мне есть 18</Text>
            </Pressable>
            <Pressable style={s.modalAlt} onPress={() => setAgeAsk(false)}>
              <Text style={s.modalAltText}>Мне нет 18</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Карточка места */}
      <Modal visible={!!place} transparent animationType="slide">
        <Pressable style={s.sheetBack} onPress={() => setPlace(null)}>
          <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
            {place && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {!!place.imageUrl && (
                  <Image source={{ uri: place.imageUrl }} style={s.sheetImg} />
                )}
                <View style={s.sheetBody}>
                  <View style={s.catRow}>
                    <View
                      style={[s.catDot, { backgroundColor: CATEGORY_COLORS[place.category] }]}
                    />
                    <Text style={s.catText}>{CATEGORY_LABELS[place.category]}</Text>
                    <Text style={s.rating}>★ {place.rating}</Text>
                  </View>
                  <Text style={s.title}>{place.name}</Text>
                  <Text style={s.addr}>{place.address}</Text>
                  <Text style={s.desc}>{place.description}</Text>
                  <View style={s.metaRow}>
                    <Text style={s.meta}>
                      {place.price === 0 ? 'Бесплатно' : `от ${place.price} ₽`}
                    </Text>
                    <Text style={s.meta}>~{Math.round(place.duration / 60)} ч</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = (p: Palette) =>
  StyleSheet.create({
    btn18: {
      position: 'absolute',
      left: 14,
      backgroundColor: p.card,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    btn18on: { backgroundColor: '#C04CFF' },
    btn18text: { fontWeight: '800', fontSize: 15, color: p.text },
    modalBack: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    modalCard: {
      backgroundColor: p.card,
      borderRadius: 20,
      padding: 22,
      width: '100%',
      maxWidth: 380,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: p.text, marginBottom: 8 },
    modalText: { fontSize: 15, color: p.text2, lineHeight: 21, marginBottom: 18 },
    modalMain: {
      backgroundColor: '#C04CFF',
      borderRadius: 13,
      paddingVertical: 13,
      alignItems: 'center',
      marginBottom: 10,
    },
    modalMainText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    modalAlt: { paddingVertical: 11, alignItems: 'center' },
    modalAltText: { color: p.text2, fontSize: 15, fontWeight: '600' },
    sheetBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: p.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '75%',
      overflow: 'hidden',
    },
    sheetImg: { width: '100%', height: 190 },
    sheetBody: { padding: 20 },
    catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 7 },
    catText: { fontSize: 13, fontWeight: '600', color: p.text2, flex: 1 },
    rating: { fontSize: 14, fontWeight: '700', color: '#E8A33D' },
    title: { fontSize: 22, fontWeight: '800', color: p.text, marginBottom: 4 },
    addr: { fontSize: 14, color: p.text3, marginBottom: 12 },
    desc: { fontSize: 15, color: p.text2, lineHeight: 22, marginBottom: 14 },
    metaRow: { flexDirection: 'row', gap: 18 },
    meta: { fontSize: 14, fontWeight: '600', color: p.text },
  });
