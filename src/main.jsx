// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'

const clientId = "327500077174-p5n3ue3885f2l5dcdd0tl39v8u2u4eoq.apps.googleusercontent.com"

const Root = () => {
  // If no client ID, don’t mount the provider at all (prevents “Missing client_id”)
  if (!clientId) {
    return (
      <StrictMode>
        <App />
      </StrictMode>
    )
  }
  return (
    <StrictMode>
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')).render(<Root />)
