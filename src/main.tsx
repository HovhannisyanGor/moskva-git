import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n'
import { loadPlaces } from './data/places'

// Места приезжают с сервера — тот же список, что у мобильного приложения.
// Ждём их до первого рендера: карта, поиск и достижения читают PLACES
// синхронно, и пустой список на первом кадре выглядел бы как «мест нет».
// Если сервер недоступен, loadPlaces молча оставит кеш прошлого запуска.
loadPlaces().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  )
})
