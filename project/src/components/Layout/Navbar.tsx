
import React, { useState } from 'react';
import { Brain, User, LogOut, Settings, Calendar, BookOpen, TrendingUp } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Brain, path: '/' },
    { id: 'subjects', label: 'Subjects', icon: BookOpen, path: '/subjects' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/schedule' },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/analytics' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ];

  const currentPage = location.pathname.replace('/', '') || 'dashboard';

  return (
    <nav className="bg-gradient-to-r from-indigo-900 to-purple-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Brain className="h-8 w-8 text-cyan-400 animate-pulse" />
              <span className="ml-2 text-xl font-bold text-white">
                AI Learning Scheduler
              </span>
            </div>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-300 ${
                      currentPage === item.id
                        ? 'border-cyan-400 text-cyan-300'
                        : 'border-transparent text-gray-300 hover:text-cyan-300 hover:border-cyan-400'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-300">
              <User className="h-4 w-4 mr-2 text-cyan-400" />
              <span>{user?.firstName} {user?.lastName}</span>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-300 bg-gray-800 bg-opacity-50 hover:bg-opacity-70 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-300"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
            <button
              className="md:hidden text-gray-300 hover:text-cyan-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-gradient-to-b from-gray-800 to-gray-900 animate-fade-in">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-all duration-300 ${
                    currentPage === item.id
                      ? 'bg-cyan-900 bg-opacity-20 border-cyan-400 text-cyan-300'
                      : 'border-transparent text-gray-300 hover:text-cyan-300 hover:bg-gray-800 hover:border-cyan-400'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
