// components/navigation/Navbar.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiDollarSign, FiPieChart, FiUser, FiSettings } from 'react-icons/fi';

const Navbar: React.FC = () => {
  const pathname = usePathname();
  
  // Helper function to determine if a route is active
  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm mb-6">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center">
          <div className="flex flex-1 space-x-4">
            <Link 
              href="/dashboard" 
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                isActive('/dashboard') 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FiHome className="mr-2" />
              Dashboard
            </Link>
            <Link 
              href="/expenses" 
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                isActive('/expenses') 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FiDollarSign className="mr-2" />
              Expenses
            </Link>
            <Link 
              href="/forecasts" 
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                isActive('/forecasts') 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FiPieChart className="mr-2" />
              AI Insights
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              href="/settings" 
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                isActive('/settings') 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FiSettings className="mr-2" />
              Settings
            </Link>
            <Link 
              href="/" 
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                pathname === '/' 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FiUser className="mr-2" />
              Profile
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;