import React from 'react'
import { createRoot } from 'react-dom/client'
// Import the component with explicit extension to avoid Vite caching ambiguity
import GestionEdificios from './GestionEdificios.jsx'

function App(){
  return <GestionEdificios />
}

const root = createRoot(document.getElementById('root'))
root.render(<App />)
