//components/dashboard/ExpenseDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, TooltipProps
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface StatisticsData {
  totalExpenses: number;
  expensesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    total: number;
    count: number;
    percentage: number;
  }>;
  expensesOverTime: Array<{
    month: string;
    total: number;
    count: number;
  }>;
  budgetUtilization: Array<{
    categoryId: string | null;
    categoryName: string;
    budgetAmount: number;
    spentAmount: number;
    utilizationPercentage: number;
    overBudget: boolean;
  }>;
  averageExpense: number;
  monthlyChange: number;
}

const ExpenseDashboard: React.FC = () => {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('3months'); // '1month', '3months', '6months', '1year'

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Calculate date range based on selected time range
        const endDate = new Date();
        let startDate;

        switch (timeRange) {
          case '1month':
            startDate = startOfMonth(new Date());
            break;
          case '3months':
            startDate = startOfMonth(subMonths(new Date(), 2));
            break;
          case '6months':
            startDate = startOfMonth(subMonths(new Date(), 5));
            break;
          case '1year':
            startDate = startOfMonth(subMonths(new Date(), 11));
            break;
          default:
            startDate = startOfMonth(subMonths(new Date(), 2));
        }

        const response = await fetch(`/api/statistics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
        
        if (!response.ok) throw new Error('Failed to fetch statistics');
        
        const data = await response.json();
        setStatistics(data.statistics);
      } catch (error) {
        console.error('Error fetching statistics:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [timeRange]);

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(e.target.value);
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">No data:</strong>
        <span className="block sm:inline"> No expense data found for the selected time period.</span>
      </div>
    );
  }

  // Format data for charts
  const categoryData = statistics.expensesByCategory.map(cat => ({
    name: cat.categoryName,
    value: cat.total,
    color: cat.categoryColor || '#6b7280', // Default gray if no color
    percentage: cat.percentage,
  }));

  const timeSeriesData = statistics.expensesOverTime.map(item => ({
    name: format(new Date(item.month), 'MMM yyyy'),
    amount: item.total,
    count: item.count,
  }));

  const budgetData = statistics.budgetUtilization.map(budget => ({
    name: budget.categoryName,
    budgeted: budget.budgetAmount,
    spent: budget.spentAmount,
    percentage: budget.utilizationPercentage,
    overBudget: budget.overBudget,
  }));

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || entry.stroke }}>
              {entry.name}: {entry.value === 'percentage' 
                ? formatPercentage(entry.value) 
                : formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Define colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Expense Dashboard</h2>
        <div className="flex items-center space-x-2">
          <label htmlFor="timeRange" className="text-sm text-gray-600">Time Range:</label>
          <select
            id="timeRange"
            value={timeRange}
            onChange={handleTimeRangeChange}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="1month">This Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-sm text-blue-500 font-medium mb-1">Total Expenses</h3>
          <p className="text-2xl font-semibold">{formatCurrency(statistics.totalExpenses)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <h3 className="text-sm text-green-500 font-medium mb-1">Average Expense</h3>
          <p className="text-2xl font-semibold">{formatCurrency(statistics.averageExpense)}</p>
        </div>
        <div className={`${statistics.monthlyChange >= 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'} p-4 rounded-lg border`}>
          <h3 className="text-sm font-medium mb-1" style={{ color: statistics.monthlyChange >= 0 ? '#ef4444' : '#10b981' }}>
            Monthly Change
          </h3>
          <p className="text-2xl font-semibold" style={{ color: statistics.monthlyChange >= 0 ? '#ef4444' : '#10b981' }}>
            {statistics.monthlyChange >= 0 ? '+' : ''}{formatPercentage(statistics.monthlyChange)}
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Expenses By Category (Pie Chart) */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Expenses By Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percentage }) => `${name}: ${formatPercentage(percentage)}`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Over Time (Line Chart) */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Expenses Over Time</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timeSeriesData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" />
                <YAxis 
                  tickFormatter={formatCurrency}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="amount" name="Expenses" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget vs. Actual (Bar Chart) */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-medium mb-4">Budget vs. Actual Spending</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={budgetData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" tickFormatter={formatCurrency} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={formatPercentage} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="budgeted" name="Budget" fill="#82ca9d" />
                <Bar yAxisId="left" dataKey="spent" name="Actual" fill="#8884d8" />
                <Bar yAxisId="right" dataKey="percentage" name="% of Budget" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Efficiency Score Card */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
        <h3 className="text-lg font-medium mb-4">Spending Efficiency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories Over Budget */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Categories Over Budget</h4>
            {budgetData.filter(budget => budget.percentage > 100).length > 0 ? (
              <ul className="space-y-2">
                {budgetData
                  .filter(budget => budget.percentage > 100)
                  .map((budget, index) => (
                    <li key={index} className="flex justify-between items-center bg-red-50 p-3 rounded-md">
                      <span>{budget.name}</span>
                      <span className="text-red-600 font-medium">{formatPercentage(budget.percentage)}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-green-600 italic">No categories are over budget!</p>
            )}
          </div>

          {/* Categories Under Budget */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Top Saving Categories</h4>
            <ul className="space-y-2">
              {budgetData
                .filter(budget => budget.percentage <= 100 && budget.percentage > 0)
                .sort((a, b) => a.percentage - b.percentage)
                .slice(0, 3)
                .map((budget, index) => (
                  <li key={index} className="flex justify-between items-center bg-green-50 p-3 rounded-md">
                    <span>{budget.name}</span>
                    <span className="text-green-600 font-medium">{formatPercentage(100 - budget.percentage)} saved</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDashboard;