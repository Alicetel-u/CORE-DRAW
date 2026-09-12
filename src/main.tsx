import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './modes.css'
import './quest.css'
import './roster-fix.css'
import './stage-result-hud.css'
import './grouping-config.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
