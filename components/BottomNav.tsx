import React from 'react';
import { Tab } from '../types';
import { Icons } from './Icons';

interface BottomNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const navItems = [
    { id: Tab.PRODUCTS, label: '海鮮禮盒', icon: Icons.Product },
    { id: Tab.BRAND, label: '品牌介紹', icon: Icons.Brand },
    { id: Tab.ORDERS, label: '訂單查詢', icon: Icons.Order },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe z-40 transition-colors duration-300">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${
                isActive 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;