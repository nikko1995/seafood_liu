
import React, { useEffect, useState } from 'react';
import { Icons } from './Icons';
import { Tab, SiteSettings } from '../types';

interface HeaderProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    settings?: SiteSettings; // Optional settings prop to get Logo
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, settings }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check system preference initially
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const navItems = [
    { id: Tab.PRODUCTS, label: '海鮮商品' },
    { id: Tab.BRAND, label: '品牌介紹' },
    { id: Tab.ORDERS, label: '訂單查詢' },
  ];

  return (
    // Changed: 'sticky top-0' removed for mobile, added 'md:sticky md:top-0' for desktop only.
    <header className="relative md:sticky md:top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Left Side: Logo */}
        <div 
            className="flex items-center gap-3 cursor-pointer select-none" 
            onClick={() => onTabChange(Tab.PRODUCTS)}
        >
            {settings?.websiteLogo ? (
                 <img src={settings.websiteLogo} alt="Logo" className="w-10 h-10 object-contain rounded-xl" />
            ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-200/50 flex items-center justify-center text-white transform hover:scale-105 transition-transform duration-200">
                    <Icons.Fish size={24} strokeWidth={2.5} />
                </div>
            )}
            <div className="flex flex-col">
                <h1 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">海鮮小劉</h1>
                <span className="text-[10px] font-bold text-blue-500 tracking-wider">SEAFOOD LIU</span>
            </div>
        </div>
        
        {/* Right Side: Desktop Nav + Theme Toggle */}
        <div className="flex items-center gap-4">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === item.id
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-300'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Divider */}
            <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

            {/* Theme Toggle */}
            <button 
                onClick={toggleTheme}
                title="切換主題"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-90"
                aria-label="Toggle Theme"
            >
                {isDark ? <Icons.Sun size={20} /> : <Icons.Moon size={20} />}
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
