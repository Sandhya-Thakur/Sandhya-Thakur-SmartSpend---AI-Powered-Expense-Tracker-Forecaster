// components/recurring-expenses/RecurringExpensesList.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiEdit2 } from 'react-icons/fi';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string | null;
  categoryId: string;
  category?: Category;
}

interface RecurringExpensesListProps {
  onEditExpense?: (id: string) => void;
  onCreateExpense?: () => void;
}

const RecurringExpensesList: React.FC<RecurringExpensesListProps> = ({ 
  onEditExpense,
  onCreateExpense
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  useEffect(() => {
    const fetchRecurringExpenses = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/recurring-expenses');
        
        if (!response.ok) {
          throw new Error('Failed to fetch recurring expenses');
        }
        
        const data = await response.json();
        setRecurringExpenses(data.recurringExpenses || []);
      } catch (error) {
        console.error('Error fetching recurring expenses:', error);
        setError('Failed to load recurring expenses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecurringExpenses();
  }, []);

  // Helper function to format frequency for display
  const formatFrequency = (frequency: string) => {
    const mapping: { [key: string]: string } = {
      'weekly': 'Weekly',
      'biweekly': 'Bi-weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'yearly': 'Yearly',
    };
    return mapping[frequency] || frequency;
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading recurring expenses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md">
        {error}
      </div>
    );
  }

  if (recurringExpenses.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">No recurring expenses found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Frequency
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Start Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                End Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {recurringExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {expense.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${expense.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatFrequency(expense.frequency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(expense.startDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {expense.endDate ? formatDate(expense.endDate) : 'No end date'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {expense.category ? (
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: expense.category.color }}
                      ></div>
                      {expense.category.name}
                    </div>
                  ) : (
                    'Uncategorized'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {onEditExpense ? (
                    <button
                      onClick={() => onEditExpense(expense.id)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <FiEdit2 size={18} />
                      <span className="sr-only">Edit</span>
                    </button>
                  ) : (
                    <Link href={`/recurring-expenses/${expense.id}/edit`} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                      <FiEdit2 size={18} />
                      <span className="sr-only">Edit</span>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecurringExpensesList;