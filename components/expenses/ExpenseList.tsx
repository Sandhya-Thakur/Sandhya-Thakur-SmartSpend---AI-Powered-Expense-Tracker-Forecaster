"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { FiEdit, FiTrash2, FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  paymentMethod?: string;
  location?: string;
}

interface FilterOptions {
  startDate: string | null;
  endDate: string | null;
  categoryId: string | null;
  minAmount: string | null;
  maxAmount: string | null;
}

// Static categories as a fallback if API fails
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

const ExpenseList: React.FC = () => {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>(staticCategories);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [categoryMap, setCategoryMap] = useState<{[key: string]: Category}>({});

  const [filters, setFilters] = useState<FilterOptions>({
    startDate: null,
    endDate: null,
    categoryId: null,
    minAmount: null,
    maxAmount: null,
  });

  // Fetch expenses and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Create a map of static categories for fallback
        const staticCatMap: {[key: string]: Category} = {};
        staticCategories.forEach((cat: Category) => {
          staticCatMap[cat.id] = cat;
        });

        // Try to fetch categories
        /*
        try {
          const categoryResponse = await fetch('/api/categories');
          if (categoryResponse.ok) {
            const categoryData = await categoryResponse.json();
            setCategories(categoryData.categories);

            // Create a map of category IDs to category objects for quick lookup
            const catMap: {[key: string]: Category} = {};
            categoryData.categories.forEach((cat: Category) => {
              catMap[cat.id] = cat;
            });
            setCategoryMap(catMap);
          } else {
            // If categories API fails, use static categories
            setCategoryMap(staticCatMap);
          }
        } catch (categoryError) {
          console.error('Error fetching categories:', categoryError);
          // If categories API fails, use static categories
          setCategoryMap(staticCatMap);
        }
          */

        // Build query string from filters
        let queryString = '';
        if (filters.startDate) queryString += `startDate=${filters.startDate}&`;
        if (filters.endDate) queryString += `endDate=${filters.endDate}&`;
        if (filters.categoryId) queryString += `categoryId=${filters.categoryId}&`;
        if (filters.minAmount) queryString += `minAmount=${filters.minAmount}&`;
        if (filters.maxAmount) queryString += `maxAmount=${filters.maxAmount}&`;

        // Fetch expenses with filters
        const expenseResponse = await fetch(`/api/expenses?${queryString}`);
        if (!expenseResponse.ok) throw new Error('Failed to fetch expenses');
        const expenseData = await expenseResponse.json();
        setExpenses(expenseData.expenses);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load expenses. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value === '' ? null : value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      categoryId: null,
      minAmount: null,
      maxAmount: null,
    });
  };

  const handleSort = (field: 'date' | 'amount' | 'description') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    if (sortField === 'date') {
      return sortDirection === 'asc'
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    
    if (sortField === 'amount') {
      return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    
    // Sort by description
    return sortDirection === 'asc'
      ? a.description.localeCompare(b.description)
      : b.description.localeCompare(a.description);
  });

  const handleEdit = (id: string) => {
    router.push(`/expenses/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete expense');

      // Remove the deleted expense from the list
      setExpenses(expenses.filter(expense => expense.id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Get category for an expense, using the map or finding one with matching ID
  const getCategoryForExpense = (expense: Expense): Category | undefined => {
    if (categoryMap[expense.categoryId]) {
      return categoryMap[expense.categoryId];
    }
    
    // Fallback to finding in static categories
    return staticCategories.find(cat => cat.id === expense.categoryId);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Your Expenses</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <FiFilter className="mr-2" />
            Filters
          </button>
          <button
            onClick={() => router.push('/expenses/add')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Expense
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700">
          <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Filter Expenses</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate || ''}
                  onChange={handleFilterChange}
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 py-1 px-2 text-sm dark:bg-gray-800 dark:text-white"
                  placeholder="From"
                />
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate || ''}
                  onChange={handleFilterChange}
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 py-1 px-2 text-sm dark:bg-gray-800 dark:text-white"
                  placeholder="To"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                name="categoryId"
                value={filters.categoryId || ''}
                onChange={handleFilterChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 py-1 px-2 text-sm dark:bg-gray-800 dark:text-white"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  name="minAmount"
                  value={filters.minAmount || ''}
                  onChange={handleFilterChange}
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 py-1 px-2 text-sm dark:bg-gray-800 dark:text-white"
                  placeholder="Min"
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  name="maxAmount"
                  value={filters.maxAmount || ''}
                  onChange={handleFilterChange}
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 py-1 px-2 text-sm dark:bg-gray-800 dark:text-white"
                  placeholder="Max"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-3 flex justify-end">
            <button
              onClick={resetFilters}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <div className="py-10 text-center text-gray-500 dark:text-gray-400">
          No expenses found. Add your first expense to get started!
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md flex justify-between items-center">
            <span className="font-medium text-gray-900 dark:text-white">Total: ${totalAmount.toFixed(2)}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{expenses.length} expenses</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      <span>Date</span>
                      {sortField === 'date' && (
                        sortDirection === 'asc' ?
                          <FiChevronUp className="ml-1" /> :
                          <FiChevronDown className="ml-1" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center">
                      <span>Description</span>
                      {sortField === 'description' && (
                        sortDirection === 'asc' ?
                          <FiChevronUp className="ml-1" /> :
                          <FiChevronDown className="ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end">
                      <span>Amount</span>
                      {sortField === 'amount' && (
                        sortDirection === 'asc' ?
                          <FiChevronUp className="ml-1" /> :
                          <FiChevronDown className="ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedExpenses.map((expense) => {
                  const category = getCategoryForExpense(expense);
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(expense.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {expense.description}
                        {expense.location && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                            at {expense.location}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {category && (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${category.color}20`,
                              color: category.color
                            }}
                          >
                            {category.name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right font-medium">
                        ${expense.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(expense.id)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ExpenseList;