// app/dashboard/page.tsx
"use client"

import { useState } from 'react';
import ExpenseDashboard from '@/components/dashboard/ExpenseDashboard';
import BudgetList from '@/components/budget/BudgetList';
import BudgetForm from '@/components/budget/BudgetForm';
import { FiTrendingUp, FiAlertTriangle, FiTag, FiPieChart, FiList, FiPlusCircle } from 'react-icons/fi';

// Placeholder ML insight component
const InsightCard = ({ 
  title, 
  content, 
  icon, 
  color = 'blue' 
}: { 
  title: string; 
  content: string; 
  icon: React.ReactNode; 
  color?: 'blue' | 'green' | 'red' | 'yellow'; 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300',
    green: 'bg-green-50 border-green-100 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300',
    red: 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300',
  };
  
  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-start">
        <div className="mr-3 mt-1">
          {icon}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm mt-1">{content}</p>
        </div>
      </div>
    </div>
  );
};

type DashboardTab = 'expenses' | 'budgets' | 'new-budget' | 'edit-budget';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('expenses');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

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

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Your expenses, trends, and budget management
        </p>
      </div>

      {/* AI-Powered Insights Section - Placeholders for ML predictions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
          AI-Powered Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            title="Spending Forecast"
            content="Based on your history, you're projected to spend $1,240 next month, which is 8% lower than this month."
            icon={<FiTrendingUp size={18} />}
            color="green"
          />
          <InsightCard
            title="Unusual Spending"
            content="Your restaurant spending this month is 35% higher than your usual pattern."
            icon={<FiAlertTriangle size={18} />}
            color="yellow"
          />
          <InsightCard
            title="Category Suggestion"
            content="We've identified 5 transactions that may be miscategorized. Click to review."
            icon={<FiTag size={18} />}
            color="blue"
          />
        </div>
      </div>

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
      </div>
    </main>
  );
}