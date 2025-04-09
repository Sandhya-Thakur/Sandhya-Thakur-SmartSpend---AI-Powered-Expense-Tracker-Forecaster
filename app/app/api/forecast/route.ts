// app/api/forecast/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// This function executes the ML pipeline script and returns a promise

// Alternative implementation that just reads the latest forecast file
async function getLatestForecast(): Promise<string> {
  try {
    const filePath = path.join(process.cwd(), 'ml_pipeline/latest_forecast.txt');
    const forecastText = await fs.readFile(filePath, 'utf8');
    return forecastText.trim();
  } catch (error) {
    console.error('Error reading forecast file:', error);
    throw error;
  }
}

// Parse the forecast text into structured data
function parseForecastText(forecastText: string): {
  amount: number;
  percentChange: number;
  trend: 'higher' | 'lower';
} {
  try {
    // Extract the amount using regex
    const amountMatch = forecastText.match(/\$([0-9,]+)/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(',', ''), 10) : 0;

    // Extract the percentage change
    const percentMatch = forecastText.match(/([0-9]+)% (higher|lower)/);
    const percentChange = percentMatch ? parseInt(percentMatch[1], 10) : 0;
    const trend = percentMatch ? (percentMatch[2] as 'higher' | 'lower') : 'higher';

    return {
      amount,
      percentChange,
      trend
    };
  } catch (error) {
    console.error('Error parsing forecast text:', error);
    return {
      amount: 0,
      percentChange: 0,
      trend: 'higher'
    };
  }
}

export async function GET() {
  try {
    // Option 1: Run the model each time (may be slower)
    // const forecastText = await runForecastModel();
    
    // Option 2: Read the latest forecast file (faster)
    const forecastText = await getLatestForecast();
    
    // Parse the forecast text
    const forecastData = parseForecastText(forecastText);
    
    // Additional data you might want to include
    const response = {
      forecast: forecastData,
      lastUpdated: new Date().toISOString(),
      forecastText,
      // Include accuracy metrics if available
      accuracy: null,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Forecast API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}