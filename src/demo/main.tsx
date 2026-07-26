import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Reset browser defaults only for demo app — not part of the library
const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
  #root { height: 100%; }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
