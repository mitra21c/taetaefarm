import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// GitHub Pages: 404.html 이 ?p=<경로> 로 넘겨준 주소를 복원
const redirectPath = new URLSearchParams(window.location.search).get('p')
if (redirectPath) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  window.history.replaceState(null, '', base + redirectPath)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
