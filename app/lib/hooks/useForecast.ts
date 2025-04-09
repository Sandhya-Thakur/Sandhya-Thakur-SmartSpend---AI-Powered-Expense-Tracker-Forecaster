// lib/hooks/useForecast.ts
import { useState, useEffect } from 'react';

type ForecastStatus = 'loading' | 'success' | 'error';

interface ForecastData {
  amount: number;
  percentChange: number;
  trend: 'higher' | 'lower';
}

interface ForecastResponse {
  forecast: ForecastData;
  lastUpdated: string;
  forecastText: string;
  accuracy: {
    report: string;
  } | null;
}

export function useForecast() {
  const [status, setStatus] = useState<ForecastStatus>('loading');
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        setStatus('loading');
        const response = await fetch('/api/forecast');
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const forecastData = await response.json();
        setData(forecastData);
        setStatus('success');
      } catch (err) {
        console.error('Error fetching forecast:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    };

    fetchForecast();
  }, []);

  return {
    isLoading: status === 'loading',
    isError: status === 'error',
    isSuccess: status === 'success',
    forecast: data?.forecast || null,
    forecastText: data?.forecastText || null,
    lastUpdated: data?.lastUpdated ? new Date(data.lastUpdated) : null,
    accuracy: data?.accuracy || null,
    error
  };
}