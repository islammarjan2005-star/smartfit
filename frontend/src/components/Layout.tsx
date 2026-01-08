import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  Home,
  Shirt,
  Layers,
  Camera,
  MapPin,
  Sparkles,
  BarChart3,
  LogOut,
  Video,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
  const { logout } = useAuth();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/video-insights', icon: Video, label: 'Video' },
    { to: '/wardrobe', icon: Shirt, label: 'Wardrobe' },
    { to: '/outfits', icon: Layers, label: 'Outfits' },
    { to: '/suggestions', icon: Sparkles, label: 'For You' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main Content */}
      <main className="max-w-lg mx-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
