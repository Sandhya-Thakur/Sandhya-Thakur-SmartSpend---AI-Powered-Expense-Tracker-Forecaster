// app/dashboard/page.tsx
"use client"

import { useState } from 'react';
import ExpenseDashboard from '@/components/dashboard/ExpenseDashboard';
import BudgetList from '@/components/budget/BudgetList';
import BudgetForm from '@/components/budget/BudgetForm';
import RecurringExpensesList from '@/components/recurring-expenses/RecurringExpensesList';
import RecurringExpenseForm from '@/components/recurring-expenses/RecurringExpenseForm';
import { FiPieChart, FiList, FiPlusCircle, FiRepeat } from 'react-icons/fi';
import { AIInsights } from '@/components/insights/AIInsights';

type DashboardTab = 'expenses' | 'budgets' | 'new-budget' | 'edit-budget' | 'recurring' | 'new-recurring' | 'edit-recurring';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('expenses');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [selectedRecurringExpenseId, setSelectedRecurringExpenseId] = useState<string | null>(null);

  // Handle tab switching
  const switchTab = (tab: DashboardTab) => {
    setActiveTab(tab);
  };

  // Handle budget edit selection
  const handleEditBudget = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setActiveTab('edit-budget');
  };

  // Handle budget creation
  const handleCreateBudget = () => {
    setActiveTab('new-budget');
  };

  // Handle budget form success/cancel
  const handleBudgetSuccess = () => {
    setActiveTab('budgets');
  };

  // Handle recurring expense edit selection
  const handleEditRecurringExpense = (expenseId: string) => {
    setSelectedRecurringExpenseId(expenseId);
    setActiveTab('edit-recurring');
  };

  // Handle recurring expense creation
  const handleCreateRecurringExpense = () => {
    setActiveTab('new-recurring');
  };

  // Handle recurring expense form success/cancel
  const handleRecurringExpenseSuccess = () => {
    setActiveTab('recurring');
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Your expenses, trends, and budget management
          </p>
        </div>
        
        {/* Add New Expense Button */}
        <button
          onClick={handleCreateRecurringExpense}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <FiPlusCircle className="mr-2" />
          Add Expense
        </button>
      </div>

      {/* AI-Powered Insights Section - Now using real ML data */}
      <AIInsights />

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button 
              onClick={() => switchTab('expenses')}
              className={`inline-flex items-center py-2 px-4 text-sm font-medium rounded-t-lg border-b-2 ${
                activeTab === 'expenses' 
                  ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                  : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FiPieChart className="mr-2" />
              Expense Analytics
            </button>
          </li>
          <li className="mr-2">
            <button 
              onClick={() => switchTab('budgets')}
              className={`inline-flex items-center py-2 px-4 text-sm font-medium rounded-t-lg border-b-2 ${
                activeTab === 'budgets' || activeTab === 'new-budget' || activeTab === 'edit-budget' 
                  ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                  : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FiList className="mr-2" />
              Budget Management
            </button>
          </li>
          <li className="mr-2">
            <button 
              onClick={() => switchTab('recurring')}
              className={`inline-flex items-center py-2 px-4 text-sm font-medium rounded-t-lg border-b-2 ${
                activeTab === 'recurring' || activeTab === 'new-recurring' || activeTab === 'edit-recurring' 
                  ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                  : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FiRepeat className="mr-2" />
              Recurring Expenses
            </button>
          </li>
        </ul>
      </div>

      {/* Content based on active tab */}
      <div className="pb-6">
        {activeTab === 'expenses' && <ExpenseDashboard />}
        
        {activeTab === 'budgets' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <BudgetList 
              onEditBudget={handleEditBudget}
              onCreateBudget={handleCreateBudget}
            />
          </div>
        )}
        
        {activeTab === 'new-budget' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Create New Budget</h2>
            <BudgetForm 
              onSuccess={handleBudgetSuccess} 
              onCancel={() => setActiveTab('budgets')} 
            />
          </div>
        )}
        
        {activeTab === 'edit-budget' && selectedBudgetId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Edit Budget</h2>
            <BudgetForm 
              budgetId={selectedBudgetId} 
              onSuccess={handleBudgetSuccess} 
              onCancel={() => setActiveTab('budgets')} 
            />
          </div>
        )}

        {activeTab === 'recurring' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recurring Expenses</h2>
              <button
                onClick={handleCreateRecurringExpense}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <FiPlusCircle className="mr-2" />
                Add New
              </button>
            </div>
            <RecurringExpensesList onEditExpense={handleEditRecurringExpense} />
          </div>
        )}

        {activeTab === 'new-recurring' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Create New Recurring Expense</h2>
            <RecurringExpenseForm 
              onSuccess={handleRecurringExpenseSuccess} 
              onCancel={() => setActiveTab('recurring')} 
            />
          </div>
        )}
        
        {activeTab === 'edit-recurring' && selectedRecurringExpenseId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Edit Recurring Expense</h2>
            <RecurringExpenseForm 
              recurringExpenseId={selectedRecurringExpenseId} 
              onSuccess={handleRecurringExpenseSuccess} 
              onCancel={() => setActiveTab('recurring')} 
            />
          </div>
        )}
      </div>
    </main>
  );
}