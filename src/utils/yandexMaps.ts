// Загружает скрипт Яндекс.Карт (JS API v3) один раз и возвращает готовый объект ymaps3.
// Ключ берётся из переменной окружения VITE_YANDEX_API_KEY.

let loadPromise: Promise<unknown> | null = null;

export function loadYandexMaps(apiKey: string): Promise<unknown> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const w = window as unknown as { ymaps3?: { ready: Promise<void> } };
    const finish = () => w.ymaps3!.ready.then(() => resolve(w.ymaps3));

    if (w.ymaps3) {
      finish();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.onload = finish;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Не удалось загрузить Яндекс.Карты'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
