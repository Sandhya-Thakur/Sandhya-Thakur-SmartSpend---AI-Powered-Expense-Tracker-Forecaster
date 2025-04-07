// app/expenses/add/page.tsx
"use client"

import Link from 'next/link';
import ExpenseForm from '@/components/forms/ExpenseForm';
import { FiArrowLeft } from 'react-icons/fi';

export default function AddExpensePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link
          href="/expenses"
          className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Go back"
        >
          <FiArrowLeft className="text-gray-600 dark:text-gray-400" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Expense</h1>
      </div>
      
      <ExpenseForm />
    </main>
  );
}