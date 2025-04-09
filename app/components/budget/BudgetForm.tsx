// components/budget/BudgetForm.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiSave, FiX, FiTrash2 } from 'react-icons/fi';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface BudgetFormProps {
  budgetId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Static categories as a fallback
const staticCategories: Category[] = [
  { id: 'food-dining', name: 'Food & Dining', color: '#FF5722', icon: 'restaurant' },
  { id: 'transportation', name: 'Transportation', color: '#2196F3', icon: 'car' },
  { id: 'housing', name: 'Housing', color: '#4CAF50', icon: 'home' },
  { id: 'utilities', name: 'Utilities', color: '#FFC107', icon: 'bolt' },
  { id: 'entertainment', name: 'Entertainment', color: '#9C27B0', icon: 'movie' },
  { id: 'shopping', name: 'Shopping', color: '#E91E63', icon: 'shopping-bag' },
  { id: 'healthcare', name: 'Healthcare', color: '#00BCD4', icon: 'medical-services' },
  { id: 'personal', name: 'Personal', color: '#795548', icon: 'person' },
  { id: 'education', name: 'Education', color: '#3F51B5', icon: 'school' },
  { id: 'other', name: 'Other', color: '#607D8B', icon: 'more-horiz' }
];

const BudgetForm: React.FC<BudgetFormProps> = ({ budgetId, onSuccess, onCancel }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>(staticCategories);
  
  const [formData, setFormData] = useState({
    amount: '',
    period: 'monthly',
    startDate: new Date(),
    categoryId: '',
  });

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories.length > 0 ? data.categories : staticCategories);
          
          // Set default categoryId if categories are available
          if (data.categories.length > 0 && !formData.categoryId) {
            setFormData(prev => ({ ...prev, categoryId: data.categories[0].id }));
          }
        } else {
          // Use static categories if API fails
          setCategories(staticCategories);
          if (!formData.categoryId) {
            setFormData(prev => ({ ...prev, categoryId: staticCategories[0].id }));
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fall back to static categories if the fetch fails
        setCategories(staticCategories);
        if (!formData.categoryId) {
          setFormData(prev => ({ ...prev, categoryId: staticCategories[0].id }));
        }
      }
    };

    fetchCategories();
  }, []);

  // If editing an existing budget, fetch its data
  useEffect(() => {
    if (budgetId) {
      const fetchBudget = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/budgets/${budgetId}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch budget data');
          }
          
          const data = await response.json();
          
          setFormData({
            amount: data.budget.amount.toString(),
            period: data.budget.period,
            startDate: new Date(data.budget.startDate),
            categoryId: data.budget.categoryId || '',
          });
        } catch (error) {
          console.error('Error fetching budget:', error);
          setError('Failed to load budget data');
        } finally {
          setIsLoading(false);
        }
      };

      fetchBudget();
    }
  }, [budgetId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, startDate: date }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate form
      if (!formData.amount || !formData.period) {
        throw new Error('Please fill all required fields');
      }

      // Prepare the request
      const url = budgetId ? `/api/budgets` : '/api/budgets';
      const method = budgetId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(budgetId && { id: budgetId }),
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save budget');
      }

      // Call onSuccess callback if provided
      if (onSuccess) onSuccess();
      
      // Redirect if no callback
      if (!onSuccess) {
        router.push('/budgets');
      }

    } catch (error) {
      console.error('Error saving budget:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!budgetId) return;
    
    if (!confirm('Are you sure you want to delete this budget? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/budgets?id=${budgetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete budget');
      }

      // Redirect to budgets list or call success callback
      if (onSuccess) onSuccess();
      else router.push('/budgets');

    } catch (error) {
      console.error('Error deleting budget:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete budget');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md flex justify-center items-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading budget data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {budgetId ? 'Edit Budget' : 'Create Budget'}
        </h2>
        
        {budgetId && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center px-3 py-2 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <FiTrash2 className="mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount */}
          <div className="space-y-2">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Budget Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                className="pl-8 w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Period */}
          <div className="space-y-2">
            <label htmlFor="period" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Period <span className="text-red-500">*</span>
            </label>
            <select
              id="period"
              name="period"
              value={formData.period}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Start Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              selected={formData.startDate}
              onChange={handleDateChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              dateFormat="yyyy-MM-dd"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Overall Budget (No Category)</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty for an overall budget across all categories.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onCancel || (() => router.back())}
            className="mr-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FiX className="inline mr-1" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 dark:disabled:bg-blue-800"
          >
            <FiSave className="inline mr-1" />
            {isLoading ? 'Saving...' : budgetId ? 'Update Budget' : 'Create Budget'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BudgetForm;