from flask import Flask, request, jsonify # type: ignore
from flask_cors import CORS
import torch # type: ignore
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler # type: ignore
import json
import os
import psycopg2 # type: ignore
from datetime import datetime, timedelta

# Import the LSTM model class
from lstm_model import LSTMModel

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables
model = None
scaler = None
sequence_length = 7

def connect_to_db():
    """Connect to the PostgreSQL database."""
    try:
        # Update these with your actual database credentials
        conn = psycopg2.connect(
            host="localhost",
            database="smartspend",
            user="postgres",
            password="your_password"  # Replace with your actual password
        )
        return conn
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        return None

def load_model():
    """Load the trained LSTM model."""
    global model, scaler
    
    # Load the model
    model_path = "models/lstm_model.pth"
    if not os.path.exists(model_path):
        print(f"Model file not found: {model_path}")
        return False
    
    # Initialize the model with the same architecture used during training
    model = LSTMModel(input_size=1, hidden_size=64, num_layers=2)
    model.load_state_dict(torch.load(model_path))
    model.eval()
    
    # Initialize the scaler (we'll fit it on demand with the latest data)
    scaler = MinMaxScaler(feature_range=(0, 1))
    
    return True

def get_recent_expenses(user_id, days=30):
    """Get recent expenses for a user from the database."""
    conn = connect_to_db()
    if not conn:
        return None
    
    try:
        # Calculate the date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Query to get daily expenses
        query = """
        SELECT 
            DATE(date) as expense_date,
            SUM(amount) as total_amount
        FROM expenses
        WHERE user_id = %s AND date >= %s AND date <= %s
        GROUP BY DATE(date)
        ORDER BY expense_date ASC
        """
        
        # Execute the query
        cursor = conn.cursor()
        cursor.execute(query, (user_id, start_date, end_date))
        
        # Fetch results
        results = cursor.fetchall()
        
        # Convert to DataFrame
        df = pd.DataFrame(results, columns=['date', 'total_expense'])
        
        # Ensure we have data for every day in the range
        date_range = pd.date_range(start=start_date, end=end_date)
        date_df = pd.DataFrame({'date': date_range})
        
        # Convert the date column to date only (no time)
        date_df['date'] = date_df['date'].dt.date
        df['date'] = pd.to_datetime(df['date']).dt.date
        
        # Merge to fill in missing dates
        complete_df = pd.merge(date_df, df, on='date', how='left')
        complete_df['total_expense'] = complete_df['total_expense'].fillna(0)
        
        return complete_df
    
    except Exception as e:
        print(f"Error getting expenses: {e}")
        return None
    
    finally:
        conn.close()

def prepare_sequence(data):
    """Prepare a sequence for prediction from recent expense data."""
    # Extract and scale values
    values = data['total_expense'].values.reshape(-1, 1)
    
    # Fit the scaler on these values
    scaled_values = scaler.fit_transform(values)
    
    # Get the last sequence_length days of data
    if len(scaled_values) >= sequence_length:
        last_sequence = scaled_values[-sequence_length:]
    else:
        # If we don't have enough data, pad with zeros
        padding = np.zeros((sequence_length - len(scaled_values), 1))
        last_sequence = np.vstack((padding, scaled_values))
    
    # Convert to tensor
    sequence_tensor = torch.FloatTensor(last_sequence).unsqueeze(0)  # Add batch dimension
    
    return sequence_tensor

def generate_predictions(sequence_tensor, days_to_predict=30):
    """Generate future predictions using the loaded model."""
    model.eval()
    
    # Start with the input sequence
    current_sequence = sequence_tensor
    future_predictions = []
    
    # Generate predictions step by step
    for _ in range(days_to_predict):
        with torch.no_grad():
            # Get prediction for next step
            pred = model(current_sequence)
            future_predictions.append(pred.item())
            
            # Update sequence by removing first element and adding the prediction
            new_sequence = torch.cat((current_sequence[:, 1:, :], pred.unsqueeze(0).unsqueeze(2)), dim=1)
            current_sequence = new_sequence
    
    # Convert predictions back to original scale
    future_predictions = np.array(future_predictions).reshape(-1, 1)
    future_predictions = scaler.inverse_transform(future_predictions)
    
    return future_predictions.flatten()

@app.route('/api/predict', methods=['POST'])
def predict():
    """API endpoint to get expense predictions."""
    try:
        # Get user_id from request
        data = request.json
        user_id = data.get('userId')
        days_to_predict = data.get('days', 30)
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Get recent expenses for this user
        expenses_df = get_recent_expenses(user_id)
        if expenses_df is None or len(expenses_df) == 0:
            return jsonify({'error': 'No expense data available for prediction'}), 400
        
        # Prepare the sequence for prediction
        sequence = prepare_sequence(expenses_df)
        
        # Generate predictions
        predictions = generate_predictions(sequence, days_to_predict)
        
        # Create dates for the predictions
        last_date = expenses_df['date'].iloc[-1]
        if isinstance(last_date, str):
            last_date = datetime.strptime(last_date, '%Y-%m-%d').date()
        
        prediction_dates = [(last_date + timedelta(days=i+1)).isoformat() for i in range(len(predictions))]
        
        # Format response
        response = {
            'prediction': [
                {'date': date, 'amount': float(amount)} 
                for date, amount in zip(prediction_dates, predictions)
            ],
            'historicalData': [
                {'date': row['date'].isoformat(), 'amount': float(row['total_expense'])}
                for _, row in expenses_df.iterrows()
            ]
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"Error generating predictions: {e}")
        return jsonify({'error': f'Failed to generate predictions: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'model_loaded': model is not None})

if __name__ == '__main__':
    # Load the model on startup
    model_loaded = load_model()
    if not model_loaded:
        print("Failed to load model. Please train the model first.")
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)