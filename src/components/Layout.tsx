import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const SidebarItem = ({ emoji, label, active, onClick }: { emoji: string, label: string, active?: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-accent text-white electric-glow' 
        : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`}
  >
    <span className="text-xl">{emoji}</span>
    <span className="font-medium">{label}</span>
  </button>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { emoji: '🏠', label: 'Dashboard', path: '/' },
    { emoji: '🏭', label: 'Content Factory', path: '/factory' },
    { emoji: '📅', label: 'Calendar', path: '/calendar' },
    { emoji: '📊', label: 'Analytics', path: '/analytics' },
    { emoji: '⚙️', label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-bg-dark flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 p-6 space-y-8">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-bg-dark font-bold text-xl">S</div>
          <h1 className="text-xl font-bold tracking-tight">Society Hub</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.path}
              emoji={item.emoji}
              label={item.label}
              active={window.location.pathname === item.path || (item.path !== '/' && window.location.pathname.startsWith(item.path))}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>

        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center space-x-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-white/40 truncate capitalize">{user?.plan} Plan</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full mt-4 flex items-center space-x-3 px-4 py-3 rounded-xl text-alert hover:bg-alert/10 transition-all duration-200"
          >
            <span className="text-xl">🚪</span>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-bg-dark/80 backdrop-blur-lg border-b border-white/5 flex items-center justify-between px-6 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-bg-dark font-bold">S</div>
          <span className="font-bold">Society Hub</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white text-2xl">
          {isMobileMenuOpen ? '❌' : '🍔'}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="lg:hidden fixed inset-0 bg-bg-dark z-40 pt-20 p-6 flex flex-col"
          >
            <nav className="flex-1 space-y-2">
              {menuItems.map((item) => (
                <SidebarItem
                  key={item.path}
                  emoji={item.emoji}
                  label={item.label}
                  active={window.location.pathname === item.path || (item.path !== '/' && window.location.pathname.startsWith(item.path))}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                />
              ))}
            </nav>
            <button
              onClick={logout}
              className="mt-auto flex items-center space-x-3 px-4 py-4 text-alert"
            >
              <span className="text-xl">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:p-10 p-6 pt-24 lg:pt-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
