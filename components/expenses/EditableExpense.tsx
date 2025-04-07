"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiSave, FiX, FiTrash2 } from 'react-icons/fi';

// Define the Category interface
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface EditableExpenseProps {
  expenseId: string;
  onCancel: () => void;
  onSuccess: () => void;
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

const EditableExpense: React.FC<EditableExpenseProps> = ({ expenseId, onCancel, onSuccess }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  
  // Track which fields have been changed
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  
  // Keep track of the original data to know what has changed
  const [originalData, setOriginalData] = useState<any>(null);
  
  // Initialize form data
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date(),
    categoryId: '',
    paymentMethod: '',
    location: '',
  });

  // Fetch expense data
  useEffect(() => {
    const fetchExpense = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/expenses/${expenseId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch expense: ${response.status}`);
        }
        
        const data = await response.json();
        const expense = data.expense || {};
        
        // Set original data
        setOriginalData(expense);
        
        // Set form data with fallbacks for any missing fields
        setFormData({
          amount: expense.amount?.toString() || '',
          description: expense.description || '',
          date: expense.date ? new Date(expense.date) : new Date(),
          categoryId: expense.categoryId || staticCategories[0].id,
          paymentMethod: expense.paymentMethod || '',
          location: expense.location || '',
        });
      } catch (error) {
        console.error('Error fetching expense:', error);
        setError(`Failed to load expense data. ${error instanceof Error ? error.message : 'Please try again.'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpense();
  }, [expenseId]);

  // Handle field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setChangedFields(prev => new Set(prev).add(name));
  };

  // Handle date change
  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, date }));
      setChangedFields(prev => new Set(prev).add('date'));
    }
  };

  // Handle saving only changed fields
  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    
    try {
      // Only include fields that have changed
      const updates: any = {};
      
      if (changedFields.has('amount')) {
        updates.amount = parseFloat(formData.amount);
      }
      
      if (changedFields.has('description')) {
        updates.description = formData.description;
      }
      
      if (changedFields.has('date')) {
        updates.date = formData.date;
      }
      
      if (changedFields.has('categoryId')) {
        updates.categoryId = formData.categoryId;
      }
      
      if (changedFields.has('paymentMethod')) {
        updates.paymentMethod = formData.paymentMethod;
      }
      
      if (changedFields.has('location')) {
        updates.location = formData.location;
      }
      
      // Only proceed if there are changes
      if (Object.keys(updates).length === 0) {
        onSuccess();
        return;
      }
      
      // Use the correct endpoint format with ID in the path
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update expense');
      }
  
      // Call onSuccess callback
      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };
  const handleDelete = async () => {
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

      // Navigate to expenses list
      router.push('/expenses');
    } catch (error) {
      console.error('Error deleting expense:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md flex justify-center items-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading expense data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Expense</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center px-3 py-2 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <FiTrash2 className="mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount */}
        <div className="space-y-1">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount
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
              className={`pl-8 w-full rounded-md border ${
                changedFields.has('amount') ? 'border-blue-500 dark:border-blue-700' : 'border-gray-300 dark:border-gray-600'
              } py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Date
          </label>
          <DatePicker
            selected={formData.date}
            onChange={handleDateChange}
            className={`w-full rounded-md border ${
              changedFields.has('date') ? 'border-blue-500 dark:border-blue-700' : 'border-gray-300 dark:border-gray-600'
            } py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
            dateFormat="yyyy-MM-dd"
            maxDate={new Date()}
          />
        </div>

        {/* Description */}
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="What was this expense for?"
            className={`w-full rounded-md border ${
              changedFields.has('description') ? 'border-blue-500 dark:border-blue-700' : 'border-gray-300 dark:border-gray-600'
            } py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
          />
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className={`w-full rounded-md border ${
              changedFields.has('categoryId') ? 'border-blue-500 dark:border-blue-700' : 'border-gray-300 dark:border-gray-600'
            } py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
          >
            {staticCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div className="space-y-1">
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
            className={`w-full rounded-md border ${
              changedFields.has('paymentMethod') ? 'border-blue-500 dark:border-blue-700' : 'border-gray-300 dark:border-gray-600'
            } py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
          />
        </div>

        {/* Location */}
        <div className="space-y-1 md:col-span-2">
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
            className={`w-full rounded-md border ${
              changedFields.has('location') ? 'border-blue-500 dark:border-blue-700' : 'border-gray-300 dark:border-gray-600'
            } py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <FiX className="mr-1" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || changedFields.size === 0}
          className={`flex items-center px-4 py-2 rounded-md text-white ${
            changedFields.size > 0 
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          <FiSave className="mr-1" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default EditableExpense;