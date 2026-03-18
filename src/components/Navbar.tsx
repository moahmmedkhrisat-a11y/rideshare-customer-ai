import { Link, useLocation } from 'react-router-dom';
import { Car, User, LayoutDashboard, History, LogOut } from 'lucide-react';
import { Button } from './Button';
import { APP_NAME } from '../constants';

export function Navbar({ onLogout, user }: { onLogout: () => void; user: any }) {
  const location = useLocation();
  
  const navItems = [
    { label: 'Ride', path: '/', icon: Car },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'History', path: '/history', icon: History },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[5000] border-t border-neutral-200 dark:border-white/10 bg-white/90 dark:bg-black/80 p-2 backdrop-blur-2xl md:top-0 md:bottom-auto md:border-b md:border-t-0 shadow-[0_-10px_40px_rgba(6,182,212,0.05)] dark:shadow-[0_-10px_40px_rgba(6,182,212,0.1)] md:shadow-[0_10px_40px_rgba(6,182,212,0.05)] dark:md:shadow-[0_10px_40px_rgba(6,182,212,0.1)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
        <Link to="/" className="hidden items-center space-x-2 md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] dark:shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <Car className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-violet-600 dark:from-cyan-400 dark:to-violet-400 leading-none">{APP_NAME}</span>
            {user?.role === 'admin' && (
              <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">Admin Panel</span>
            )}
          </div>
        </Link>

        <div className="flex w-full items-center justify-around md:w-auto md:space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center space-y-1 px-4 py-2 transition-all duration-300 md:flex-row md:space-y-0 md:space-x-2 rounded-xl ${
                  isActive 
                    ? 'text-neutral-900 dark:text-white bg-neutral-100 dark:bg-white/10 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] dark:shadow-[inset_0_0_20px_rgba(6,182,212,0.2)] border border-neutral-200 dark:border-white/10' 
                    : 'text-neutral-500 dark:text-white/40 hover:text-neutral-900 dark:hover:text-white/80 hover:bg-neutral-100 dark:hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/10 to-violet-500/10 dark:from-cyan-500/20 dark:to-violet-500/20 blur-md -z-10" />
                )}
                <Icon className={`h-5 w-5 ${isActive ? 'text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] dark:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''}`} />
                <span className="text-[10px] font-bold md:text-sm uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center space-x-4 md:flex">
          <div className="text-right">
            <p className="text-sm font-bold text-neutral-900 dark:text-white">{user?.name || 'User'}</p>
            <p className="text-[10px] font-bold text-neutral-500 dark:text-white/40 uppercase tracking-widest">{user?.phone}</p>
          </div>
          <Button variant="ghost" size="sm" className="space-x-2 text-neutral-600 dark:text-white/60 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 border border-transparent hover:border-neutral-200 dark:hover:border-white/10 rounded-xl transition-all" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            <span className="font-bold uppercase tracking-wider text-xs">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
