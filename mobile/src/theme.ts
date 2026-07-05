// Палитра Localee — те же цвета, что на сайте (тёмная и светлая темы).
export const ACCENT = '#FA3C3C';

export interface Palette {
  bg: string;
  bg2: string;
  card: string;
  border: string;
  text: string;
  text2: string;
  text3: string;
  accent: string;
  inputBg: string;
}

export const DARK: Palette = {
  bg: '#121013',
  bg2: '#1B181D',
  card: '#201C23',
  border: '#2E2933',
  text: '#F4F2F5',
  text2: '#A9A2B0',
  text3: '#6F6878',
  accent: ACCENT,
  inputBg: '#26212B',
};

export const LIGHT: Palette = {
  bg: '#FFFFFF',
  bg2: '#F5F4F6',
  card: '#FFFFFF',
  border: '#E7E4EA',
  text: '#17141A',
  text2: '#5F5966',
  text3: '#9B94A3',
  accent: ACCENT,
  inputBg: '#F1EFF3',
};
