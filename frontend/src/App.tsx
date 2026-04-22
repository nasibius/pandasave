import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import { Landing } from './pages/Landing';
import { ChildDashboard } from './pages/ChildDashboard';
import { ParentDashboard } from './pages/ParentDashboard';
import { MicroGame } from './pages/Game';
import { ResetPassword } from './pages/ResetPassword';
import { ResetPin } from './pages/ResetPin';

function AuthGuard({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'parent' | 'child' }) {
  const { role } = useAppStore();
  
  if (!role) return <Navigate to="/" />;
  if (requiredRole && role !== requiredRole) return <Navigate to={`/${role}`} />;
  
  return <>{children}</>;
}

function ThemeEffect() {
  const { theme } = useAppStore();
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return null;
}

function ThemeToggle() {
  const { theme, setTheme } = useAppStore();
  return (
    <button 
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
      className="fixed top-4 right-4 z-50 p-3 bg-[var(--card)] border border-[var(--line)] rounded-full shadow-lg hover:scale-105 transition-transform text-[var(--text)]"
      title="Toggle Dark Mode"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

function AppRoutes() {
  const { role, token, setAuth, sync, socket } = useAppStore();

  useEffect(() => {
    if (token && role && !socket) {
      // Rehydrate auth onto socket safely
      const familyId = localStorage.getItem('familyId');
      if (familyId) {
        setAuth(token, familyId, role);
      }
    } else if (token) {
      sync();
    }
  }, [token, role, socket, setAuth, sync]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={role ? <Navigate to={`/${role}`} /> : <Landing />} />
        <Route path="/reset-password" element={role ? <Navigate to={`/${role}`} /> : <ResetPassword />} />
        <Route path="/reset-pin" element={role ? <Navigate to={`/${role}`} /> : <ResetPin />} />
        
        <Route path="/child" element={
          <AuthGuard requiredRole="child">
             <ChildDashboard />
          </AuthGuard>
        } />
        
        <Route path="/parent" element={
          <AuthGuard requiredRole="parent">
             <ParentDashboard />
          </AuthGuard>
        } />

        <Route path="/game" element={
          <AuthGuard requiredRole="child">
             <MicroGame />
          </AuthGuard>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <>
      <ThemeEffect />
      <ThemeToggle />
      <AppRoutes />
    </>
  );
}
