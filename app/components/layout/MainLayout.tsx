// components/layout/MainLayout.tsx
import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { FiHome, FiDollarSign, FiPieChart, FiSettings, FiLogOut } from 'react-icons/fi';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  
  const isActive = (path: string) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  // If auth is still loading or user is not signed in, show minimal layout
  if (!isLoaded || !isSignedIn) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">SmartSpend</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-Powered Financial Insights</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <Link 
                href="/dashboard" 
                className={`flex items-center px-4 py-2 rounded-md ${
                  isActive('/dashboard') 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <FiHome className="mr-3" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                href="/expenses" 
                className={`flex items-center px-4 py-2 rounded-md ${
                  isActive('/expenses') 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <FiDollarSign className="mr-3" />
                Expenses
              </Link>
            </li>
            <li>
              <Link 
                href="/forecasts" 
                className={`flex items-center px-4 py-2 rounded-md ${
                  isActive('/forecasts') 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <FiPieChart className="mr-3" />
                Forecasts & Insights
              </Link>
            </li>
            <li>
              <Link 
                href="/settings" 
                className={`flex items-center px-4 py-2 rounded-md ${
                  isActive('/settings') 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <FiSettings className="mr-3" />
                Settings
              </Link>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
              {user?.firstName?.charAt(0) || user?.username?.charAt(0) || '?'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.firstName || user?.username}
              </p>
              <button 
                onClick={() => router.push('/sign-out')}
                className="text-xs text-red-500 hover:text-red-700 flex items-center mt-1"
              >
                <FiLogOut className="mr-1" size={12} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">SmartSpend</h1>
          {/* Mobile menu button would go here */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 md:p-8 mt-16 md:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;