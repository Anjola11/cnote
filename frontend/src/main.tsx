import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import './styles/globals.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <SpeedInsights />
  </StrictMode>
);
