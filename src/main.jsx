import { Buffer } from "buffer";
globalThis.Buffer = Buffer;

import App from "./App";
import "./index.css";
// ... rest of your entry file unchangedimport React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
