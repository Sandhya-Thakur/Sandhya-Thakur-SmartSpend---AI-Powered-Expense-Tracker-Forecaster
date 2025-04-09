import os
import torch # type: ignore
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt # type: ignore
from sklearn.preprocessing import MinMaxScaler # type: ignore
from lstm_model import LSTMModel, load_data, forecast_future
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_model_loading():
    """Test that the model loads correctly"""
    logging.info("Testing model loading...")
    
    # Check if model exists
    model_path = "models/lstm_model.pth"
    if not os.path.exists(model_path):
        logging.error(f"Model file not found at {model_path}")
        return False
    
    # Initialize model
    model = LSTMModel(input_size=1, hidden_size=64, num_layers=2)
    
    # Try to load model
    try:
        model.load_state_dict(torch.load(model_path))
        model.eval()
        logging.info("Model loaded successfully")
        return model
    except Exception as e:
        logging.error(f"Error loading model: {e}")
        return False

def test_prediction(model):
    """Test model predictions on existing data"""
    logging.info("Testing model predictions...")
    
    # Load data
    data = load_data()
    if data is None:
        return False
    
    # Create scaler
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit_transform(data['total_expense'].values.reshape(-1, 1))
    
    # Test future predictions
    try:
        # Get last 7 days for input sequence
        prediction_days = 14
        logging.info(f"Generating {prediction_days} days of predictions...")
        future_preds = forecast_future(model, data, scaler, steps=prediction_days, sequence_length=7)
        
        # Visualize predictions
        plt.figure(figsize=(12, 6))
        
        # Plot historical data
        historical_dates = data['date'].tolist()
        historical_values = data['total_expense'].tolist()
        plt.plot(historical_dates, historical_values, 'b-', label='Historical Data')
        
        # Create future dates for predictions
        last_date = data['date'].iloc[-1]
        future_dates = pd.date_range(start=last_date, periods=prediction_days+1)[1:]
        
        # Plot predictions
        plt.plot(future_dates, future_preds, 'r--', label='Predicted')
        
        plt.title('Expense Forecast Test')
        plt.xlabel('Date')
        plt.ylabel('Expense Amount')
        plt.legend()
        plt.grid(True)
        
        # Create plots directory if it doesn't exist
        os.makedirs('plots', exist_ok=True)
        plt.savefig('plots/test_prediction.png')
        plt.close()
        
        logging.info(f"Predicted values: {future_preds}")
        logging.info(f"Prediction visualization saved to plots/test_prediction.png")
        return True
    except Exception as e:
        logging.error(f"Error in prediction testing: {e}")
        return False

def main():
    """Run all tests"""
    logging.info("Starting model testing...")
    
    # Test model loading
    model = test_model_loading()
    if not model:
        return
    
    # Test predictions
    test_prediction(model)
    
    logging.info("Testing completed")

if __name__ == "__main__":
    main()