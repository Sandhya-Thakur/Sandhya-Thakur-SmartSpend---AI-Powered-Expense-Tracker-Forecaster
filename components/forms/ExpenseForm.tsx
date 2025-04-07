"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiTrash2 } from 'react-icons/fi';

// Define the Category interface
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface ExpenseFormProps {
  expenseId?: string;
  onSuccess?: () => void;
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

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expenseId, onSuccess }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<Category[]>(staticCategories);

  // Initialize form with the first static category as default
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date(),
    categoryId: staticCategories[0].id,
    paymentMethod: '',
    location: '',
  });

  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          // Check the structure of the API response
          const categoriesArray = data.categories || data || [];
          if (categoriesArray.length > 0) {
            setCategories(categoriesArray);
          }
        }
      } catch (error) {
        console.error('Error fetching categories, using static fallback:', error);
        // Keep using the static categories as fallback
      }
    };

    fetchCategories();
  }, []);

  // If editing an existing expense, fetch its data
  useEffect(() => {
    if (expenseId) {
      const fetchExpense = async () => {
        try {
          setIsLoading(true);
          // Updated to match your new API structure
          const response = await fetch(`/api/expenses?id=${expenseId}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch expense: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Check if the categoryId from API exists in our categories
          // If not, default to the first category
          const categoryExists = categories.some(cat => cat.id === data.expense.categoryId);
          
          setFormData({
            amount: data.expense.amount.toString(),
            description: data.expense.description,
            date: new Date(data.expense.date),
            categoryId: categoryExists ? data.expense.categoryId : categories[0].id,
            paymentMethod: data.expense.paymentMethod || '',
            location: data.expense.location || '',
          });
        } catch (error) {
          console.error('Error fetching expense:', error);
          setError(`Failed to load expense data. ${error instanceof Error ? error.message : 'Please try again.'}`);
        } finally {
          setIsLoading(false);
        }
      };

      fetchExpense();
    }
  }, [expenseId, categories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, date }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.amount || !formData.description || !formData.categoryId) {
        throw new Error('Please fill all required fields');
      }

      // Prepare the request - using the same API endpoint with different method
      const url = '/api/expenses';
      const method = expenseId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(expenseId && { id: expenseId }), // Include ID only when updating
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save expense');
      }

      setSuccess(expenseId ? 'Expense updated successfully!' : 'Expense added successfully!');
      
      // Reset form if it's a new expense
      if (!expenseId) {
        setFormData({
          amount: '',
          description: '',
          date: new Date(),
          categoryId: formData.categoryId, // Keep the selected category
          paymentMethod: '',
          location: '',
        });
      }

      // Call onSuccess callback if provided
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Error saving expense:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!expenseId) return;
    
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/expenses?id=${expenseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete expense');
      }

      // If successful, redirect to expenses list
      setSuccess('Expense deleted successfully!');
      setTimeout(() => {
        router.push('/expenses');
      }, 1000);

    } catch (error) {
      console.error('Error deleting expense:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {expenseId ? 'Edit Expense' : 'Add New Expense'}
        </h2>
        
        {expenseId && (
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

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md">
          {success}
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

          {/* Date */}
          <div className="space-y-2">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              selected={formData.date}
              onChange={handleDateChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              dateFormat="yyyy-MM-dd"
              maxDate={new Date()}
            />
          </div>

          {/* Description */}
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What was this expense for?"
              required
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
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

          {/* Payment Method */}
          <div className="space-y-2">
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Method
            </label>
            <input
              type="text"
              id="paymentMethod"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              placeholder="Credit Card, Cash, etc."
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Location */}
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Where did this expense occur?"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="mr-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 dark:disabled:bg-blue-800"
          >
            {isLoading ? 'Saving...' : expenseId ? 'Update Expense' : 'Add Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;