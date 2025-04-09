// components/budget/BudgetList.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { FiEdit, FiPlusCircle, FiAlertCircle } from 'react-icons/fi';

interface Budget {
  id: string;
  amount: number;
  period: string;
  startDate: string;
  categoryId: string | null;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
}

interface BudgetListProps {
  onEditBudget?: (budgetId: string) => void;
  onCreateBudget?: () => void;
}

const BudgetList: React.FC<BudgetListProps> = ({ onEditBudget, onCreateBudget }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/budgets');
        
        if (!response.ok) {
          throw new Error('Failed to fetch budgets');
        }
        
        const data = await response.json();
        setBudgets(data.budgets || []);
      } catch (error) {
        console.error('Error fetching budgets:', error);
        setError('Failed to load budgets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBudgets();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatPeriod = (period: string) => {
    switch (period) {
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return period;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-md mb-4">
        <p className="flex items-center">
          <FiAlertCircle className="mr-2" />
          {error}
        </p>
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400 mb-4">You haven't created any budgets yet.</p>
        <button 
          onClick={onCreateBudget}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <FiPlusCircle className="mr-2" />
          Create Your First Budget
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Budgets</h2>
        <button 
          onClick={onCreateBudget}
          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          <FiPlusCircle className="mr-1" />
          New Budget
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {budgets.map((budget) => (
              <tr key={budget.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap">
                  {budget.category ? (
                    <div className="flex items-center">
                      <span 
                        className="inline-block h-3 w-3 rounded-full mr-2" 
                        style={{ backgroundColor: budget.category.color }}
                      ></span>
                      <span className="text-gray-800 dark:text-gray-200">{budget.category.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-800 dark:text-gray-200">Overall Budget</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                  {formatCurrency(budget.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                  {formatPeriod(budget.period)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                  {formatDate(budget.startDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button 
                    onClick={() => onEditBudget && onEditBudget(budget.id)} 
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    <FiEdit className="inline mr-1" /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BudgetList;