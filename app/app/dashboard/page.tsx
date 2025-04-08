// app/dashboard/page.tsx
"use client"

import ExpenseDashboard from '@/components/dashboard/ExpenseDashboard';
import { FiTrendingUp, FiAlertTriangle, FiTag } from 'react-icons/fi';

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
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
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

export default function DashboardPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Your expenses, trends, and AI-driven insights
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

      {/* Expense Dashboard */}
      <ExpenseDashboard />
    </main>
  );
}