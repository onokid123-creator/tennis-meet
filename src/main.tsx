import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import App from './App.tsx';
import './index.css';

const STORAGE_VERSION = 'v82_final_clean_start';

const alreadyReset = localStorage.getItem('reset_completed') === STORAGE_VERSION;

if (!alreadyReset) {
  localStorage.clear();
  sessionStorage.clear();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  if (supabaseUrl && supabaseAnonKey) {
    const tempClient = createClient(supabaseUrl, supabaseAnonKey);
    tempClient.auth.signOut().finally(() => {
      localStorage.setItem('app_storage_version', STORAGE_VERSION);
      localStorage.setItem('reset_completed', STORAGE_VERSION);
      window.location.replace('/signup');
    });
  } else {
    localStorage.setItem('app_storage_version', STORAGE_VERSION);
    localStorage.setItem('reset_completed', STORAGE_VERSION);
    window.location.replace('/signup');
  }
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
