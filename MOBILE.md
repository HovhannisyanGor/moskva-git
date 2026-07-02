# Localee — мобильное приложение (iOS + Android)

Приложение сделано на [Capacitor](https://capacitorjs.com): внутри крутится тот же
React-сайт из `dist/`, API — прод (`https://api.localee.ru`, задаётся в `.env.production`).

## Как внести изменения в приложение

Правишь обычный код сайта в `src/` — это ОДНА кодовая база с сайтом. Потом:

```bash
npm run app:sync        # = npm run build + npx cap sync (копирует dist в iOS/Android)
```

## Запуск

```bash
npm run app:ios         # пересобрать и открыть Xcode  → ▶ на симуляторе
npm run app:android     # пересобрать и открыть Android Studio → ▶ на эмуляторе
```

Живая перезагрузка при разработке (правки видны сразу, без пересборки):

```bash
npx cap run ios --live-reload --external
npx cap run android --live-reload --external
```

## Что где лежит

- `capacitor.config.ts` — конфиг приложения (id `ru.localee.app`, имя Localee)
- `ios/`, `android/` — нативные проекты (генерируются, правим редко)
- `assets/logo.png` — исходник иконки; перегенерация иконок/сплэшей:
  `npx @capacitor/assets generate --iconBackgroundColor '#111111' --splashBackgroundColor '#111111'`

## Что нужно для сборки

- iOS: Mac + Xcode (для публикации — Apple Developer, $99/год)
- Android: Android Studio или просто JDK (`cd android && ./gradlew assembleDebug`);
  готовый APK: `android/app/build/outputs/apk/debug/app-debug.apk`
  (для публикации — Google Play Console, $25 разово)
