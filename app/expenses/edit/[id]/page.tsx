// app/expenses/edit/[id]/page.tsx
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';
import EditableExpense from '@/components/expenses/EditableExpense';

export default function EditExpensePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  
  const handleCancel = () => {
    router.push('/expenses');
  };
  
  const handleSuccess = () => {
    router.push('/expenses');
  };

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Expense</h1>
      </div>
      
      <EditableExpense 
        expenseId={id} 
        onCancel={handleCancel} 
        onSuccess={handleSuccess} 
      />
    </main>
  );
}