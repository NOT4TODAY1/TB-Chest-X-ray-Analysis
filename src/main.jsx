import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TBDetector from "./TBDetector.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TBDetector />
  </StrictMode>
)