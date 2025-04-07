// pages/forecasts.tsx
"use client"
import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import MainLayout from '@/components/layout/MainLayout';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { FiInfo, FiAlertCircle } from 'react-icons/fi';

// Mock data for the charts - will be replaced with actual ML predictions
const forecastData = [
  { month: 'Jan', actual: 1200, predicted: null },
  { month: 'Feb', actual: 1350, predicted: null },
  { month: 'Mar', actual: 1100, predicted: null },
  { month: 'Apr', actual: 950, predicted: null },
  { month: 'May', actual: 1400, predicted: null },
  { month: 'Jun', actual: 1250, predicted: null },
  // Future months - only predictions
  { month: 'Jul', actual: null, predicted: 1300 },
  { month: 'Aug', actual: null, predicted: 1280 },
  { month: 'Sep', actual: null, predicted: 1350 },
];

const anomalyData = [
  { date: '2024-01-05', amount: 120, isAnomaly: false },
  { date: '2024-01-12', amount: 85, isAnomaly: false },
  { date: '2024-01-19', amount: 250, isAnomaly: true },
  { date: '2024-01-26', amount: 90, isAnomaly: false },
  { date: '2024-02-02', amount: 110, isAnomaly: false },
  { date: '2024-02-09', amount: 95, isAnomaly: false },
  { date: '2024-02-16', amount: 320, isAnomaly: true },
  { date: '2024-02-23', amount: 105, isAnomaly: false },
  { date: '2024-03-01', amount: 90, isAnomaly: false },
  { date: '2024-03-08', amount: 100, isAnomaly: false },
];

const ForecastsPage: React.FC = () => {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [forecastPeriod, setForecastPeriod] = useState('3months');
  
  // Redirect if user is not authenticated
  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <MainLayout>
      <Head>
        <title>Forecasts & Insights | SmartSpend</title>
        <meta name="description" content="View AI-powered spending forecasts and financial insights" />
      </Head>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forecasts & Insights</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          AI-powered predictions and spending pattern analysis
        </p>
      </div>

      {/* Explanation Note */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-md text-blue-800 flex items-start">
        <FiInfo className="mr-3 mt-1 flex-shrink-0" />
        <div>
          <h3 className="font-medium">AI Forecasting Models</h3>
          <p className="text-sm mt-1">
            Our spending forecasts are powered by LSTM neural networks trained on your historical spending patterns.
            The anomaly detection uses Isolation Forest algorithms to identify unusual transactions.
          </p>
        </div>
      </div>

      {/* Spending Forecast */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Spending Forecast</h2>
          <select
            value={forecastPeriod}
            onChange={(e) => setForecastPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="1month">1 Month</option>
            <option value="3months">3 Months</option>
            <option value="6months">6 Months</option>
          </select>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={forecastData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="actual" 
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.3} 
                name="Actual Spending" 
              />
              <Area 
                type="monotone" 
                dataKey="predicted" 
                stroke="#82ca9d" 
                fill="#82ca9d" 
                fillOpacity={0.3} 
                strokeDasharray="5 5" 
                name="Predicted Spending" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-purple-50 rounded-md border border-purple-100">
            <h3 className="text-sm font-medium text-purple-700">Monthly Average</h3>
            <p className="text-lg font-semibold mt-1">$1,208.33</p>
          </div>
          <div className="p-3 bg-green-50 rounded-md border border-green-100">
            <h3 className="text-sm font-medium text-green-700">Trend Direction</h3>
            <p className="text-lg font-semibold mt-1">+2.4% per month</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
            <h3 className="text-sm font-medium text-blue-700">Forecast Accuracy</h3>
            <p className="text-lg font-semibold mt-1">±8.5%</p>
          </div>
        </div>
      </div>

      {/* Anomaly Detection */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-6">Spending Anomalies</h2>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={anomalyData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#8884d8" 
                name="Weekly Spending" 
              />
              {/* Highlight anomaly points */}
              {anomalyData
                .filter(point => point.isAnomaly)
                .map((point, index) => (
                  <Line 
                    key={index}
                    type="monotone" 
                    data={[point]} 
                    dataKey="amount"
                    stroke="#ff0000"
                    strokeWidth={0}
                    dot={{ stroke: '#ff0000', strokeWidth: 2, r: 6, fill: '#ff0000' }}
                    name={index === 0 ? "Anomalies" : ""}
                    isAnimationActive={false}
                  />
                ))
              }
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4">
          <h3 className="text-md font-medium mb-2">Detected Anomalies</h3>
          <div className="space-y-3">
            {anomalyData
              .filter(point => point.isAnomaly)
              .map((anomaly, index) => (
                <div key={index} className="flex items-start p-3 bg-red-50 rounded-md border border-red-100">
                  <FiAlertCircle className="text-red-500 mr-2 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-red-700">
                      Unusual spending of ${anomaly.amount} on {anomaly.date}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      This is 185% higher than your typical weekly spending.
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Category Classification */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-6">Smart Category Suggestions</h2>
        
        <p className="text-sm text-gray-600 mb-4">
          Our AI has analyzed your recent transactions and suggests the following category adjustments:
        </p>

        <div className="space-y-3">
          <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
            <p className="text-sm font-medium">
              "Amazon" transaction on Mar 3 ($42.99)
            </p>
            <div className="flex items-center justify-between mt-2">
              <div>
                <span className="text-xs text-gray-500">Current:</span>
                <span className="ml-1 text-xs bg-gray-100 px-2 py-1 rounded">Shopping</span>
              </div>
              <span className="text-gray-400">→</span>
              <div>
                <span className="text-xs text-gray-500">Suggested:</span>
                <span className="ml-1 text-xs bg-blue-100 px-2 py-1 rounded text-blue-800">Office Supplies</span>
              </div>
            </div>
            <div className="mt-2 flex justify-end space-x-2">
              <button className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100">
                Ignore
              </button>
              <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                Apply
              </button>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
            <p className="text-sm font-medium">
              "Netflix" transaction on Mar 5 ($15.99)
            </p>
            <div className="flex items-center justify-between mt-2">
              <div>
                <span className="text-xs text-gray-500">Current:</span>
                <span className="ml-1 text-xs bg-gray-100 px-2 py-1 rounded">Miscellaneous</span>
              </div>
              <span className="text-gray-400">→</span>
              <div>
                <span className="text-xs text-gray-500">Suggested:</span>
                <span className="ml-1 text-xs bg-blue-100 px-2 py-1 rounded text-blue-800">Entertainment</span>
              </div>
            </div>
            <div className="mt-2 flex justify-end space-x-2">
              <button className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100">
                Ignore
              </button>
              <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ForecastsPage;