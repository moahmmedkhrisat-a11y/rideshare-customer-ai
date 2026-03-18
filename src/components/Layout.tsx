import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { Moon, Sun } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  onLogout: () => void;
  user: any;
}

export function Layout({ children, onLogout, user }: LayoutProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-black dark:text-white transition-colors duration-300">
      <Navbar onLogout={onLogout} user={user} />
      
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-[9999] p-2 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-md border border-neutral-200 dark:border-white/10 shadow-lg text-neutral-800 dark:text-white hover:scale-110 transition-all"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <main className="mx-auto max-w-7xl px-4 pt-4 pb-24 md:pt-24 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
