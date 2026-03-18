import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logout } from './firebase';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import { ThemeProvider } from './ThemeContext';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  if (!isAuthReady) return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-black">
      <div className="h-12 w-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
    </div>
  );

  const isAuthenticated = !!user;

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to="/" />} />
          
          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={logout}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard user={user} />} />
                    <Route path="/history" element={<History user={user} />} />
                    <Route path="/profile" element={<Profile user={user} />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
