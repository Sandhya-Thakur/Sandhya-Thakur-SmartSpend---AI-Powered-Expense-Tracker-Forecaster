// components/dashboard/ExpenseDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, TooltipProps,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiPieChart, FiCalendar, FiDollarSign } from 'react-icons/fi';

interface StatisticsData {
  totalExpenses: number;
  expensesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
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
    budgetId: string;
    categoryId: string | null;
    categoryName: string;
    categoryColor: string | null;
    categoryIcon: string | null;
    budgetAmount: number;
    period: string;
    spentAmount: number;
    recurringTotal: number;
    remainingAmount: number;
    utilizationPercentage: number;
    overBudget: boolean;
  }>;
  topExpenses: Array<{
    id: string;
    amount: number;
    description: string;
    date: string;
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
  }>;
  averageExpense: number;
  monthlyChange: number;
  periodStart: string;
  periodEnd: string;
}

const ExpenseDashboard: React.FC = () => {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('3months'); // '1month', '3months', '6months', '1year'
  const [chartView, setChartView] = useState<'category' | 'time' | 'budget'>('category');

  // Mock data function for fallback when API fails
  const getMockStatisticsData = (): StatisticsData => {
    return {
      totalExpenses: 4250.75,
      averageExpense: 106.27,
      monthlyChange: 8.5, 
      expensesByCategory: [
        { categoryId: '1', categoryName: 'Food & Dining', categoryColor: '#60a5fa', categoryIcon: 'shopping-bag', total: 1250.45, count: 28, percentage: 29.4 },
        { categoryId: '2', categoryName: 'Rent & Utilities', categoryColor: '#34d399', categoryIcon: 'home', total: 1600.00, count: 5, percentage: 37.6 },
        { categoryId: '3', categoryName: 'Transportation', categoryColor: '#fbbf24', categoryIcon: 'car', total: 450.30, count: 12, percentage: 10.6 },
        { categoryId: '4', categoryName: 'Entertainment', categoryColor: '#f87171', categoryIcon: 'film', total: 350.00, count: 8, percentage: 8.2 },
        { categoryId: '5', categoryName: 'Shopping', categoryColor: '#a78bfa', categoryIcon: 'shopping-cart', total: 600.00, count: 10, percentage: 14.1 }
      ],
      expensesOverTime: [
        { month: '2025-01-01', total: 3750.50, count: 45 },
        { month: '2025-02-01', total: 3890.20, count: 52 },
        { month: '2025-03-01', total: 4120.80, count: 58 },
        { month: '2025-04-01', total: 4250.75, count: 63 }
      ],
      budgetUtilization: [
        { budgetId: '1', categoryId: '1', categoryName: 'Food & Dining', categoryColor: '#60a5fa', categoryIcon: 'shopping-bag', budgetAmount: 1200, period: 'monthly', spentAmount: 1250.45, recurringTotal: 200, remainingAmount: -50.45, utilizationPercentage: 104.2, overBudget: true },
        { budgetId: '2', categoryId: '2', categoryName: 'Rent & Utilities', categoryColor: '#34d399', categoryIcon: 'home', budgetAmount: 1800, period: 'monthly', spentAmount: 1600, recurringTotal: 1600, remainingAmount: 200, utilizationPercentage: 88.9, overBudget: false },
        { budgetId: '3', categoryId: '3', categoryName: 'Transportation', categoryColor: '#fbbf24', categoryIcon: 'car', budgetAmount: 500, period: 'monthly', spentAmount: 450.30, recurringTotal: 200, remainingAmount: 49.7, utilizationPercentage: 90.1, overBudget: false },
        { budgetId: '4', categoryId: '4', categoryName: 'Entertainment', categoryColor: '#f87171', categoryIcon: 'film', budgetAmount: 300, period: 'monthly', spentAmount: 350, recurringTotal: 0, remainingAmount: -50, utilizationPercentage: 116.7, overBudget: true },
        { budgetId: '5', categoryId: null, categoryName: 'Overall', categoryColor: null, categoryIcon: null, budgetAmount: 4500, period: 'monthly', spentAmount: 4250.75, recurringTotal: 2000, remainingAmount: 249.25, utilizationPercentage: 94.5, overBudget: false }
      ],
      topExpenses: [
        { id: '1', amount: 1200, description: 'Monthly Rent', date: '2025-04-01', categoryId: '2', categoryName: 'Rent & Utilities', categoryColor: '#34d399', categoryIcon: 'home' },
        { id: '2', amount: 300, description: 'Grocery Shopping', date: '2025-04-03', categoryId: '1', categoryName: 'Food & Dining', categoryColor: '#60a5fa', categoryIcon: 'shopping-bag' },
        { id: '3', amount: 250, description: 'Concert Tickets', date: '2025-04-05', categoryId: '4', categoryName: 'Entertainment', categoryColor: '#f87171', categoryIcon: 'film' },
        { id: '4', amount: 180, description: 'Gas', date: '2025-04-02', categoryId: '3', categoryName: 'Transportation', categoryColor: '#fbbf24', categoryIcon: 'car' },
        { id: '5', amount: 150, description: 'Dining Out', date: '2025-04-06', categoryId: '1', categoryName: 'Food & Dining', categoryColor: '#60a5fa', categoryIcon: 'shopping-bag' }
      ],
      periodStart: '2025-01-01',
      periodEnd: '2025-04-07'
    };
  };

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

        try {
          const response = await fetch(`/api/statistics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
          
          if (!response.ok) throw new Error('Failed to fetch statistics');
          
          const data = await response.json();
          console.log("Fetched data:", data);
          setStatistics(data.statistics);
        } catch (apiError) {
          console.error('API error, using mock data:', apiError);
          
          // Use mock data as fallback when the API fails
          const mockData = getMockStatisticsData();
          setStatistics(mockData);
          
          // Set a less alarming error message
          setError('Using demo data - API is currently unavailable.');
        }
      } catch (error) {
        console.error('Error in statistics process:', error);
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-900 text-gray-300">
        <div className="text-gray-300">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${error.includes('demo data') ? 'bg-blue-900 border-blue-700 text-blue-100' : 'bg-red-900 border-red-700 text-red-100'} px-4 py-3 rounded relative border`} role="alert">
        <strong className="font-bold">{error.includes('demo data') ? 'Note:' : 'Error:'}</strong>
        <span className="block sm:inline"> {error}</span>
        {error.includes('demo data') && (
          <p className="mt-2 text-sm">
            This is showing sample visualization data while the backend is being fixed.
            <br />
            The database error: <code className="bg-blue-950 px-1 py-0.5 rounded text-xs">invalid input syntax for type integer: "275.28"</code>
          </p>
        )}
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="bg-yellow-900 border border-yellow-700 text-yellow-100 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">No data:</strong>
        <span className="block sm:inline"> No expense data found for the selected time period.</span>
      </div>
    );
  }

  // Format data for charts
  const categoryData = statistics.expensesByCategory
    .filter(cat => cat.total > 0) // Only include categories with expenses
    .map(cat => ({
      name: cat.categoryName,
      value: cat.total,
      color: cat.categoryColor || '#6b7280', // Default gray if no color
      percentage: cat.percentage,
      icon: cat.categoryIcon,
    }));

  const timeSeriesData = statistics.expensesOverTime.map(item => ({
    name: format(parseISO(item.month), 'MMM yyyy'),
    amount: item.total,
    count: item.count,
  }));

  const budgetData = statistics.budgetUtilization.map(budget => ({
    name: budget.categoryName,
    budgeted: budget.budgetAmount,
    spent: budget.spentAmount,
    recurring: budget.recurringTotal,
    remaining: budget.remainingAmount,
    percentage: budget.utilizationPercentage,
    overBudget: budget.overBudget,
    color: budget.categoryColor || '#6b7280',
  }));

  // Data for radar chart (spending patterns)
  const radarData = statistics.expensesByCategory
    .filter(cat => cat.total > 0) // Only include categories with expenses
    .map(cat => ({
      subject: cat.categoryName,
      A: cat.percentage,
      fullMark: 100,
      color: cat.categoryColor,
    }));

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-4 border border-gray-700 shadow-md rounded-md text-gray-100">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color || entry.stroke || entry.fill }}>
              {entry.name}: {entry.dataKey === 'percentage' 
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
  const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#facc15', '#38bdf8', '#4ade80', '#fb923c'];

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-100">Expense Dashboard</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="chartView" className="text-sm text-gray-300">View:</label>
            <select
              id="chartView"
              value={chartView}
              onChange={(e) => setChartView(e.target.value as 'category' | 'time' | 'budget')}
              className="bg-gray-700 border border-gray-600 text-gray-100 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="category">Categories</option>
              <option value="time">Time Series</option>
              <option value="budget">Budget</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="timeRange" className="text-sm text-gray-300">Time Range:</label>
            <select
              id="timeRange"
              value={timeRange}
              onChange={handleTimeRangeChange}
              className="bg-gray-700 border border-gray-600 text-gray-100 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1month">This Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
          <div className="flex items-center">
            <div className="bg-blue-900 p-2 rounded-full mr-3">
              <FiDollarSign className="text-blue-300" size={20} />
            </div>
            <div>
              <h3 className="text-sm text-blue-300 font-medium mb-1">Total Expenses</h3>
              <p className="text-2xl font-semibold text-gray-100">{formatCurrency(statistics.totalExpenses)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
          <div className="flex items-center">
            <div className="bg-green-900 p-2 rounded-full mr-3">
              <FiPieChart className="text-green-300" size={20} />
            </div>
            <div>
              <h3 className="text-sm text-green-300 font-medium mb-1">Average Expense</h3>
              <p className="text-2xl font-semibold text-gray-100">{formatCurrency(statistics.averageExpense)}</p>
            </div>
          </div>
        </div>
        <div className={`bg-gray-700 p-4 rounded-lg border ${statistics.monthlyChange >= 0 ? 'border-red-700' : 'border-green-700'}`}>
          <div className="flex items-center">
            <div className={`${statistics.monthlyChange >= 0 ? 'bg-red-900' : 'bg-green-900'} p-2 rounded-full mr-3`}>
              {statistics.monthlyChange >= 0 ? 
                <FiTrendingUp className={statistics.monthlyChange >= 0 ? 'text-red-300' : 'text-green-300'} size={20} /> : 
                <FiTrendingDown className="text-green-300" size={20} />
              }
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1" style={{ color: statistics.monthlyChange >= 0 ? '#fca5a5' : '#86efac' }}>
                Monthly Change
              </h3>
              <p className="text-2xl font-semibold" style={{ color: statistics.monthlyChange >= 0 ? '#fca5a5' : '#86efac' }}>
                {statistics.monthlyChange >= 0 ? '+' : ''}{formatPercentage(statistics.monthlyChange)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
          <div className="flex items-center">
            <div className="bg-purple-900 p-2 rounded-full mr-3">
              <FiCalendar className="text-purple-300" size={20} />
            </div>
            <div>
              <h3 className="text-sm text-purple-300 font-medium mb-1">Time Period</h3>
              <p className="text-xl font-semibold text-gray-100">{format(new Date(statistics.periodStart), 'MMM d')} - {format(new Date(statistics.periodEnd), 'MMM d, yyyy')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 mb-8">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-100">
            {chartView === 'category' && 'Spending by Category'}
            {chartView === 'time' && 'Spending Over Time'}
            {chartView === 'budget' && 'Budget Performance'}
          </h3>
        </div>
        
        <div className="h-96">
          {chartView === 'category' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Pie Chart */}
              <div className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
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
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-gray-300">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Radar Chart for Category Distribution */}
              <div className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#4b5563" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#d1d5db' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#d1d5db' }} />
                    <Radar
                      name="Spending %"
                      dataKey="A"
                      stroke="#60a5fa"
                      fill="#60a5fa"
                      fillOpacity={0.6}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(value) => <span className="text-gray-300">{value}</span>} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {chartView === 'time' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timeSeriesData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 30,
                  bottom: 30,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                <XAxis dataKey="name" tick={{ fill: '#d1d5db' }} />
                <YAxis
                  tickFormatter={formatCurrency}
                  domain={['auto', 'auto']}
                  tick={{ fill: '#d1d5db' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(value) => <span className="text-gray-300">{value}</span>} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Monthly Expenses"
                  stroke="#60a5fa"
                  fill="#60a5fa"
                  fillOpacity={0.3}
                  activeDot={{ r: 8 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartView === 'budget' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={budgetData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 30,
                  bottom: 30,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                <XAxis dataKey="name" tick={{ fill: '#d1d5db' }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fill: '#d1d5db' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(value) => <span className="text-gray-300">{value}</span>} />
                <Bar dataKey="budgeted" name="Budget" fill="#34d399" />
                <Bar dataKey="spent" name="Actual Spending" fill="#60a5fa" />
                <Bar dataKey="recurring" name="Recurring Expenses" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Expenses Section */}
      <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 mb-8">
        <h3 className="text-lg font-medium mb-4 text-gray-100">Top Expenses</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-600">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {statistics.topExpenses.map((expense, index) => (
                <tr key={expense.id} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <span 
                      className="inline-block w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: expense.categoryColor || '#6b7280' }}
                    ></span>
                    {expense.categoryName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(expense.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget Status Section */}
      <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 mb-6">
        <h3 className="text-lg font-medium mb-4 text-gray-100">Budget Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories Over Budget */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Categories Over Budget</h4>
            {budgetData.filter(budget => budget.percentage > 100).length > 0 ? (
              <ul className="space-y-2">
                {budgetData
                  .filter(budget => budget.percentage > 100)
                  .map((budget, index) => (
                    <li key={index} className="flex justify-between items-center bg-red-900/30 p-3 rounded-md border border-red-800">
                      <div className="flex items-center">
                        <span 
                          className="inline-block w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: budget.color }}
                        ></span>
                        <span className="text-gray-100">{budget.name}</span>
                      </div>
                      <div>
                        <span className="text-red-300 font-medium">{formatPercentage(budget.percentage)}</span>
                        <span className="text-gray-400 text-sm ml-2">({formatCurrency(budget.spent)} / {formatCurrency(budget.budgeted)})</span>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-green-300 italic">No categories are over budget!</p>
            )}
          </div>

          {/* Categories Under Budget */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Categories Under Budget</h4>
            {budgetData.filter(budget => budget.percentage <= 100 && budget.percentage > 0).length > 0 ? (
              <ul className="space-y-2">
                {budgetData
                  .filter(budget => budget.percentage <= 100 && budget.percentage > 0)
                  .sort((a, b) => a.percentage - b.percentage)
                  .slice(0, 3)
                  .map((budget, index) => (
                    <li key={index} className="flex justify-between items-center bg-green-900/30 p-3 rounded-md border border-green-800">
                      <div className="flex items-center">
                        <span 
                          className="inline-block w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: budget.color }}
                        ></span>
                        <span className="text-gray-100">{budget.name}</span>
                      </div>
                      <div>
                        <span className="text-green-300 font-medium">{formatPercentage(budget.percentage)}</span>
                        <span className="text-gray-400 text-sm ml-2">({formatCurrency(budget.spent)} / {formatCurrency(budget.budgeted)})</span>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-yellow-300 italic">No categories are under budget!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDashboard;