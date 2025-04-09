// components/insights/AIInsights.tsx
import { FiTrendingUp, FiAlertTriangle, FiTag, FiLoader } from 'react-icons/fi';
import { useForecast } from '@/lib/hooks/useForecast';
import { formatCurrency } from '@/lib/utils'; // You may need to create this util

// Insight Card Component
export const InsightCard = ({ 
  title, 
  content, 
  icon, 
  color = 'blue',
  isLoading = false
}: { 
  title: string; 
  content: string; 
  icon: React.ReactNode; 
  color?: 'blue' | 'green' | 'red' | 'yellow'; 
  isLoading?: boolean;
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
          {isLoading ? <FiLoader className="animate-spin" size={18} /> : icon}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          {isLoading ? (
            <div className="h-4 bg-gray-200 rounded animate-pulse mt-2 w-full"></div>
          ) : (
            <p className="text-sm mt-1">{content}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// AI Insights Section with Real Forecast
export const AIInsights = () => {
  const { 
    isLoading, 
    isError, 
    forecast, 
    forecastText 
  } = useForecast();

  // Determine color based on trend
  const forecastColor = forecast?.trend === 'lower' ? 'green' : 'yellow';
  
  // Format the forecast content or use placeholder
  const getForecastContent = () => {
    if (isLoading) return "Loading forecast...";
    if (isError) return "Unable to generate forecast at this time.";
    if (forecastText) return forecastText;
    
    // Fallback content if we have forecast data but no text
    if (forecast) {
      return `Based on your history, you're projected to spend ${formatCurrency(forecast.amount)} next month, which is ${forecast.percentChange}% ${forecast.trend} than this month.`;
    }
    
    return "Forecast data unavailable.";
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
        AI-Powered Insights
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InsightCard
          title="Spending Forecast"
          content={getForecastContent()}
          icon={<FiTrendingUp size={18} />}
          color={forecastColor}
          isLoading={isLoading}
        />
        <InsightCard
          title="Unusual Spending"
          content="Your restaurant spending this month is 35% higher than your usual pattern."
          icon={<FiAlertTriangle size={18} />}
          color="yellow"
        />
      </div>
    </div>
  );
};