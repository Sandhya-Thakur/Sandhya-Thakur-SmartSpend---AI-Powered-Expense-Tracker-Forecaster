// components/recurring-expenses/RecurringExpenseForm.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiSave, FiX, FiTrash2 } from 'react-icons/fi';

// Import static categories
import { staticCategories } from '@/lib/categories';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface RecurringExpenseFormProps {
  recurringExpenseId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RecurringExpenseForm: React.FC<RecurringExpenseFormProps> = ({ 
  recurringExpenseId, 
  onSuccess, 
  onCancel 
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>(staticCategories);
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    frequency: 'monthly',
    startDate: new Date(),
    endDate: null as Date | null,
    categoryId: '',
  });

  const frequencyOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ];

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
          } else if (staticCategories.length > 0 && !formData.categoryId) {
            setFormData(prev => ({ ...prev, categoryId: staticCategories[0].id }));
          }
        } else {
          // Use static categories if API fails
          setCategories(staticCategories);
          if (!formData.categoryId && staticCategories.length > 0) {
            setFormData(prev => ({ ...prev, categoryId: staticCategories[0].id }));
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fall back to static categories if the fetch fails
        setCategories(staticCategories);
        if (!formData.categoryId && staticCategories.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: staticCategories[0].id }));
        }
      }
    };

    fetchCategories();
  }, []);

  // If editing an existing recurring expense, fetch its data
  useEffect(() => {
    if (recurringExpenseId) {
      const fetchRecurringExpense = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/recurring-expenses?id=${recurringExpenseId}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch recurring expense data');
          }
          
          const data = await response.json();
          const recurringExpense = data.recurringExpenses[0];
          
          if (!recurringExpense) {
            throw new Error('Recurring expense not found');
          }
          
          setFormData({
            amount: recurringExpense.amount.toString(),
            description: recurringExpense.description,
            frequency: recurringExpense.frequency,
            startDate: new Date(recurringExpense.startDate),
            endDate: recurringExpense.endDate ? new Date(recurringExpense.endDate) : null,
            categoryId: recurringExpense.categoryId,
          });
        } catch (error) {
          console.error('Error fetching recurring expense:', error);
          setError('Failed to load recurring expense data');
        } finally {
          setIsLoading(false);
        }
      };

      fetchRecurringExpense();
    }
  }, [recurringExpenseId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, startDate: date }));
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    setFormData(prev => ({ ...prev, endDate: date }));
  };

  const handleClearEndDate = () => {
    setFormData(prev => ({ ...prev, endDate: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate form
      if (!formData.amount || !formData.description || !formData.frequency || !formData.categoryId) {
        throw new Error('Please fill all required fields');
      }

      // Prepare the request
      const method = recurringExpenseId ? 'PUT' : 'POST';
      const body = {
        ...(recurringExpenseId && { id: recurringExpenseId }),
        ...formData,
        amount: parseFloat(formData.amount),
      };
      
      const response = await fetch('/api/recurring-expenses', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save recurring expense');
      }

      // Call onSuccess callback if provided
      if (onSuccess) onSuccess();
      
      // Redirect if no callback
      if (!onSuccess) {
        router.push('/recurring-expenses');
      }

    } catch (error) {
      console.error('Error saving recurring expense:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!recurringExpenseId) return;
    
    if (!confirm('Are you sure you want to delete this recurring expense? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/recurring-expenses?id=${recurringExpenseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete recurring expense');
      }

      // Redirect to recurring expenses list or call success callback
      if (onSuccess) onSuccess();
      else router.push('/recurring-expenses');

    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete recurring expense');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md flex justify-center items-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading recurring expense data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {recurringExpenseId ? 'Edit Recurring Expense' : 'Create Recurring Expense'}
        </h2>
        
        {recurringExpenseId && (
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
              Amount <span className="text-red-500">*</span>
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

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Rent, Subscription, etc."
              required
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              id="frequency"
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {frequencyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryId"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Start Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              selected={formData.startDate}
              onChange={handleStartDateChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              dateFormat="yyyy-MM-dd"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              End Date <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <div className="flex items-center">
              <DatePicker
                selected={formData.endDate}
                onChange={handleEndDateChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                dateFormat="yyyy-MM-dd"
                isClearable
                placeholderText="No end date"
                minDate={formData.startDate}
              />
              {formData.endDate && (
                <button
                  type="button"
                  onClick={handleClearEndDate}
                  className="ml-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <FiX size={18} />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty for a recurring expense that doesn't end.
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
            {isLoading ? 'Saving...' : recurringExpenseId ? 'Update Expense' : 'Create Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecurringExpenseForm;