import type { CapacitorConfig } from '@capacitor/cli';

// Конфиг мобильного приложения (iOS + Android).
// Внутри приложения крутится тот же собранный сайт из dist/,
// API берётся из .env.production (https://api.localee.ru).
const config: CapacitorConfig = {
  appId: 'ru.localee.app',
  appName: 'Localee',
  webDir: 'dist',
  // Фон под WebView, пока грузится страница (совпадает с тёмной темой сайта)
  backgroundColor: '#111111',
  ios: {
    // Контент не залезает под чёлку/индикатор — safe-area обрабатывает сам сайт
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Запросы к API идут через нативный сетевой слой (URLSession/OkHttp),
    // а не через WebKit: в WKWebView fetch на внешний https падал с «Load failed»,
    // заодно исчезает зависимость от CORS.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
