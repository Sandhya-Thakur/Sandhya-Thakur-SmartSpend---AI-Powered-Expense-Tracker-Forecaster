// app/expenses/page.tsx
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import ExpenseList from '@/components/expenses/ExpenseList';

export default function ExpensesPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated
  useEffect(() => {
    if (isLoaded) {
      setIsLoading(false);
      if (!isSignedIn) {
        router.push('/sign-in');
      }
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show expenses page if user is signed in
  if (!isSignedIn) {
    return null; // Router will redirect, this prevents flash of unauthorized content
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track your spending
          </p>
        </div>
        
        <Link
          href="/expenses/add"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Add Expense
        </Link>
      </div>
      
      {/* Expense List Component */}
      <ExpenseList />
    </main>
  );
}