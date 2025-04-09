import os
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from lstm_model import EnhancedLSTMModel, LSTMModel, load_data, forecast_future
import logging
import argparse
import math

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def load_model():
    """Load the trained model"""
    logging.info("Loading model...")
    
    # Check if enhanced model exists
    enhanced_model_path = "models/enhanced_lstm_model.pth"
    basic_model_path = "models/lstm_model.pth"
    
    # Try enhanced model first
    if os.path.exists(enhanced_model_path):
        try:
            # Initialize enhanced model
            model = EnhancedLSTMModel(input_size=4, hidden_size=64, num_layers=2)
            model.load_state_dict(torch.load(enhanced_model_path))
            model.eval()
            logging.info("Enhanced model loaded successfully")
            return model, True
        except Exception as e:
            logging.error(f"Error loading enhanced model: {e}")
    
    # Fall back to basic model
    if os.path.exists(basic_model_path):
        try:
            # Initialize basic model
            model = LSTMModel(input_size=1, hidden_size=64, num_layers=2)
            model.load_state_dict(torch.load(basic_model_path))
            model.eval()
            logging.info("Basic model loaded successfully")
            return model, False
        except Exception as e:
            logging.error(f"Error loading basic model: {e}")
    
    logging.error("No models found")
    return None, False

def get_month_forecast(model, is_enhanced=True):
    """Generate a forecast for the next month"""
    logging.info("Generating monthly forecast...")
    
    # Load data
    data = load_data()
    if data is None:
        return None, None, None, None
    
    # Get current month's total spending
    now = datetime.now()
    current_month_start = datetime(now.year, now.month, 1)
    
    # Create date filters for current month
    current_month_mask = (data['date'] >= pd.Timestamp(current_month_start)) & \
                         (data['date'] < pd.Timestamp(now))
    
    # Calculate current month's spending (so far)
    if any(current_month_mask):
        current_month_spending = data.loc[current_month_mask, 'total_expense'].sum()
    else:
        # If no data for current month, use last month
        last_month_start = current_month_start - timedelta(days=current_month_start.day)
        last_month_end = current_month_start - timedelta(days=1)
        
        last_month_mask = (data['date'] >= pd.Timestamp(last_month_start)) & \
                          (data['date'] <= pd.Timestamp(last_month_end))
        
        if any(last_month_mask):
            current_month_spending = data.loc[last_month_mask, 'total_expense'].sum()
        else:
            # Fallback to average spending
            current_month_spending = data['total_expense'].mean() * 30
    
    logging.info(f"Current/last month spending: ${current_month_spending:.2f}")
    
    # Prepare data for forecasting
    if is_enhanced:
        # For enhanced model, create scalers for all features
        scalers = {}
        feature_columns = ['total_expense', 'budget_amount', 'remaining_budget', 'budget_variance_pct']
        
        for feature in feature_columns:
            scalers[feature] = MinMaxScaler(feature_range=(0, 1))
            scalers[feature].fit_transform(data[feature].values.reshape(-1, 1))
    else:
        # For basic model, create single scaler
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaler.fit_transform(data['total_expense'].values.reshape(-1, 1))
        scalers = {'total_expense': scaler}
    
    try:
        # Generate daily forecast for the next 30 days
        forecast_days = 30
        logging.info(f"Forecasting spending for the next {forecast_days} days...")
        
        # Fix the forecast_future call
        try:
            future_preds = forecast_future(
                model, 
                data, 
                scalers, 
                steps=forecast_days, 
                sequence_length=7,
                use_budget_features=is_enhanced
            )
        except Exception as e:
            logging.error(f"Error in forecast_future: {e}")
            import traceback
            logging.error(traceback.format_exc())
            
            # Fallback approach for the enhanced model
            if is_enhanced:
                # If we're having issues with the enhanced model forecasting, try again with the simple mode
                logging.info("Trying alternative forecasting approach...")
                
                # Create a simplified forecasting function that avoids the shape error
                def simple_forecast(model, data, scalers, steps=30):
                    # Use a simple autoregressive approach
                    sequence_length = 7
                    feature_columns = ['total_expense', 'budget_amount', 'remaining_budget', 'budget_variance_pct']
                    
                    # Get the last sequence for input
                    last_sequence = {}
                    for feature in feature_columns:
                        values = data[feature].values[-sequence_length:].reshape(-1, 1)
                        last_sequence[feature] = scalers[feature].transform(values)
                    
                    # Stack features
                    stacked_sequence = np.column_stack([last_sequence[feature] for feature in feature_columns])
                    current_sequence = torch.FloatTensor(stacked_sequence).unsqueeze(0)  # Add batch dimension
                    
                    # Get scalar values for budget features (last value) - FIXED: proper indexing
                    last_budget_amount = float(last_sequence['budget_amount'][-1][0])
                    last_remaining_budget = float(last_sequence['remaining_budget'][-1][0])
                    last_budget_variance = float(last_sequence['budget_variance_pct'][-1][0])
                    
                    # Generate predictions step by step
                    future_predictions = []
                    model.eval()
                    
                    with torch.no_grad():
                        for _ in range(steps):
                            # Get prediction for next step
                            pred = model(current_sequence)
                            pred_value = float(pred.item())
                            future_predictions.append(pred_value)
                            
                            # Create new step with scalar values
                            new_features = [[pred_value, last_budget_amount, last_remaining_budget, last_budget_variance]]
                            new_step = torch.FloatTensor(new_features).unsqueeze(1)  # Shape: [1, 1, 4]
                            
                            # Update sequence
                            current_sequence = torch.cat((current_sequence[:, 1:, :], new_step), dim=1)
                    
                    # Scale predictions back to original values
                    future_predictions = np.array(future_predictions).reshape(-1, 1)
                    future_predictions = scalers['total_expense'].inverse_transform(future_predictions)
                    
                    return future_predictions.flatten()
                
                # Try the simple forecast approach
                future_preds = simple_forecast(model, data, scalers, steps=forecast_days)
            else:
                raise e
        
        # Sum up the daily predictions to get monthly total
        next_month_forecast = future_preds.sum()
        
        # Calculate percentage change
        percentage_change = ((next_month_forecast - current_month_spending) / current_month_spending) * 100
        
        logging.info(f"Forecast complete: ${next_month_forecast:.2f} ({percentage_change:.1f}% change)")
        
        return next_month_forecast, current_month_spending, percentage_change, future_preds
    
    except Exception as e:
        logging.error(f"Error generating forecast: {e}")
        import traceback
        logging.error(traceback.format_exc())
        return None, None, None, None

def format_forecast(next_month_amount, current_month_amount, percentage_change):
    """Format the forecast in user-friendly text"""
    if next_month_amount is None:
        return "Unable to generate a spending forecast at this time. Please try again later."
    
    # Round to nearest $10
    next_month_rounded = round(next_month_amount / 10) * 10
    
    # Determine if spending is increasing or decreasing
    if percentage_change < 0:
        trend = "lower"
    else:
        trend = "higher"
    
    # Format the output
    forecast_text = f"Spending Forecast\n"
    forecast_text += f"Based on your history, you're projected to spend ${next_month_rounded:,.0f} next month, "
    forecast_text += f"which is {abs(percentage_change):.0f}% {trend} than this month."
    
    return forecast_text

# ---- NEW ACCURACY FUNCTIONS ----

def evaluate_model_historical(model, data, scalers, is_enhanced=True, sequence_length=7):
    """
    Evaluate model accuracy using historical data by comparing predictions with actuals.
    Uses a rolling window approach to predict each point based on previous data.
    
    Args:
        model: The trained LSTM model
        data: Pandas DataFrame with historical data
        scalers: Dictionary of scalers used for each feature
        is_enhanced: Whether the model is the enhanced version
        sequence_length: Length of input sequence for the model
        
    Returns:
        Dictionary of evaluation metrics
    """
    logging.info("Evaluating model on historical data...")
    
    # Ensure we have enough data
    if len(data) <= sequence_length + 30:
        print("Not enough historical data for evaluation")
        return None, None, None
    
    # Get the size of test set (last 30 days or 20% of data, whichever is smaller)
    test_size = min(30, int(len(data) * 0.2))
    
    # Split data into train and test
    train_data = data.iloc[:-test_size].copy()
    test_data = data.iloc[-test_size:].copy()
    
    # Feature columns based on model type
    if is_enhanced:
        feature_columns = ['total_expense', 'budget_amount', 'remaining_budget', 'budget_variance_pct']
    else:
        feature_columns = ['total_expense']
    
    # Prepare sequences for prediction
    actuals = test_data['total_expense'].values
    predictions = []
    
    # For each day in test set, predict based on previous sequence_length days
    for i in range(test_size):
        # Get the window of data ending right before the current test point
        window_end_idx = len(train_data) + i
        window_start_idx = window_end_idx - sequence_length
        
        window_data = data.iloc[window_start_idx:window_end_idx].copy()
        
        # Prepare input sequence
        sequence = {}
        for feature in feature_columns:
            values = window_data[feature].values.reshape(-1, 1)
            sequence[feature] = scalers[feature].transform(values)
        
        # Stack features for enhanced model
        if is_enhanced:
            stacked_sequence = np.column_stack([sequence[feature] for feature in feature_columns])
        else:
            stacked_sequence = sequence['total_expense']
            
        # Convert to tensor
        input_tensor = torch.FloatTensor(stacked_sequence).unsqueeze(0)  # Add batch dimension
        
        # Get prediction
        model.eval()
        with torch.no_grad():
            pred = model(input_tensor)
            pred_value = pred.item()
        
        # Inverse transform prediction
        pred_value = scalers['total_expense'].inverse_transform(
            np.array([[pred_value]])
        )[0][0]
        
        predictions.append(pred_value)
    
    # Calculate metrics
    mae = mean_absolute_error(actuals, predictions)
    rmse = math.sqrt(mean_squared_error(actuals, predictions))
    r2 = r2_score(actuals, predictions)
    
    # Calculate MAPE (Mean Absolute Percentage Error)
    # Avoiding division by zero
    mape = np.mean(np.abs((actuals - predictions) / np.maximum(1e-10, np.abs(actuals)))) * 100
    
    # Calculate average weekly error
    # Reshape to weeks for a clearer view
    weeks = test_size // 7
    if weeks > 0:
        weekly_actuals = [sum(actuals[i*7:(i+1)*7]) for i in range(weeks)]
        weekly_predictions = [sum(predictions[i*7:(i+1)*7]) for i in range(weeks)]
        weekly_error_pct = np.mean(np.abs((np.array(weekly_actuals) - np.array(weekly_predictions)) 
                                   / np.maximum(1e-10, np.abs(weekly_actuals)))) * 100
    else:
        weekly_error_pct = None
    
    # Create visualization directory if it doesn't exist
    os.makedirs('plots', exist_ok=True)
    
    # Visualize predictions vs actuals
    plt.figure(figsize=(12, 6))
    plt.plot(actuals, 'b-', label='Actual Spending')
    plt.plot(predictions, 'r--', label='Predicted Spending')
    plt.title('Model Validation: Predicted vs Actual Spending')
    plt.xlabel('Days')
    plt.ylabel('Daily Expense Amount ($)')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('plots/model_validation.png')
    plt.close()
    
    # Results
    metrics = {
        'MAE': mae,
        'RMSE': rmse,
        'MAPE': mape,
        'R2': r2,
        'Weekly_Error_Pct': weekly_error_pct,
        'Test_Size': test_size
    }
    
    return metrics, predictions, actuals

def print_accuracy_report(metrics):
    """
    Print a formatted accuracy report
    """
    if not metrics:
        print("No metrics available to report")
        return
    
    report = "\n===== FORECAST MODEL ACCURACY REPORT =====\n"
    report += f"Test period: last {metrics['Test_Size']} days\n\n"
    report += f"Daily metrics:\n"
    report += f"  Mean Absolute Error (MAE): ${metrics['MAE']:.2f}\n"
    report += f"  Root Mean Squared Error (RMSE): ${metrics['RMSE']:.2f}\n"
    report += f"  Mean Absolute Percentage Error (MAPE): {metrics['MAPE']:.2f}%\n"
    report += f"  R² Score: {metrics['R2']:.4f}\n"
    
    if metrics['Weekly_Error_Pct'] is not None:
        report += f"\nWeekly aggregated error: {metrics['Weekly_Error_Pct']:.2f}%\n"
    
    # Interpret the results
    if metrics['MAPE'] < 10:
        accuracy_rating = "Excellent"
    elif metrics['MAPE'] < 20:
        accuracy_rating = "Good"
    elif metrics['MAPE'] < 30:
        accuracy_rating = "Fair"
    else:
        accuracy_rating = "Poor"
    
    report += f"\nOverall forecast accuracy rating: {accuracy_rating}\n"
    
    # Add recommendations based on accuracy
    report += "\nRecommendations:\n"
    if metrics['MAPE'] > 25:
        report += "- Consider retraining the model with more recent data\n"
        report += "- Review for any seasonal patterns that might be missing\n"
    if metrics['R2'] < 0.5:
        report += "- The model may not be capturing spending patterns well\n"
        report += "- Consider adding more features or using a different model architecture\n"
    
    report += "=====================================\n"
    
    print(report)
    
    # Save report to file
    with open("model_accuracy_report.txt", "w") as f:
        f.write(report)

def perform_cross_validation(data, is_enhanced=True, folds=3):
    """
    Perform k-fold cross validation on the model
    
    Args:
        data: Full historical dataset
        is_enhanced: Whether to use enhanced model
        folds: Number of folds for cross-validation
        
    Returns:
        Average metrics across all folds
    """
    # Need to import these here to avoid circular imports
    from lstm_model import train_model
    import torch
    
    if len(data) < 90:  # Minimum data for meaningful CV
        print("Not enough data for cross-validation (need at least 90 days)")
        return None
    
    logging.info(f"Performing {folds}-fold cross-validation...")
    
    # Parameters
    sequence_length = 7
    input_size = 4 if is_enhanced else 1
    hidden_size = 64
    num_layers = 2
    learning_rate = 0.001
    num_epochs = 50
    
    # Create fold indices
    fold_size = len(data) // folds
    all_metrics = []
    
    for fold in range(folds):
        print(f"\nTraining and evaluating fold {fold+1}/{folds}")
        
        # Create validation set
        val_start = fold * fold_size
        val_end = (fold + 1) * fold_size
        
        # Split data
        train_data = pd.concat([
            data.iloc[:val_start],
            data.iloc[val_end:]
        ])
        val_data = data.iloc[val_start:val_end]
        
        # Create and train model
        if is_enhanced:
            model = EnhancedLSTMModel(input_size, hidden_size, num_layers)
        else:
            model = LSTMModel(input_size, hidden_size, num_layers)
        
        # Train the model
        trained_model, scalers = train_model(
            model, 
            train_data, 
            num_epochs=num_epochs, 
            learning_rate=learning_rate,
            sequence_length=sequence_length,
            use_budget_features=is_enhanced
        )
        
        # Evaluate on validation set
        metrics, _, _ = evaluate_model_historical(
            trained_model, 
            pd.concat([train_data.iloc[-sequence_length:], val_data]), 
            scalers, 
            is_enhanced,
            sequence_length
        )
        
        all_metrics.append(metrics)
    
    # Calculate average metrics
    avg_metrics = {
        'MAE': np.mean([m['MAE'] for m in all_metrics]),
        'RMSE': np.mean([m['RMSE'] for m in all_metrics]),
        'MAPE': np.mean([m['MAPE'] for m in all_metrics]),
        'R2': np.mean([m['R2'] for m in all_metrics]),
        'Weekly_Error_Pct': np.mean([m['Weekly_Error_Pct'] for m in all_metrics 
                                    if m['Weekly_Error_Pct'] is not None]),
        'Test_Size': fold_size
    }
    
    # Print cross-validation results
    print("\n===== CROSS-VALIDATION RESULTS =====")
    print(f"Number of folds: {folds}")
    print(f"Average MAE: ${avg_metrics['MAE']:.2f}")
    print(f"Average RMSE: ${avg_metrics['RMSE']:.2f}")
    print(f"Average MAPE: {avg_metrics['MAPE']:.2f}%")
    print(f"Average R² Score: {avg_metrics['R2']:.4f}")
    print("====================================\n")
    
    return avg_metrics

def main():
    """Generate forecast and/or evaluate model accuracy"""
    # Create argument parser
    parser = argparse.ArgumentParser(description='Spending forecast generator')
    parser.add_argument('--forecast-only', action='store_true', help='Generate only the forecast without accuracy checks')
    parser.add_argument('--accuracy-check', action='store_true', help='Run accuracy check on historical data')
    parser.add_argument('--cross-validation', action='store_true', help='Perform cross-validation on the model')
    parser.add_argument('--folds', type=int, default=3, help='Number of folds for cross-validation')
    args = parser.parse_args()
    
    logging.info("Starting spending forecast...")
    
    # Load model
    model, is_enhanced = load_model()
    if not model:
        print("Unable to load model. Please ensure the model has been trained.")
        return
    
    # Load data
    data = load_data()
    if data is None:
        print("Unable to load data. Please ensure data is available.")
        return
        
    # Generate forecast if no specific options are provided or if forecast-only is specified
    if not args.accuracy_check and not args.cross_validation or args.forecast_only:
        # Generate forecast
        next_month, current_month, percentage_change, _ = get_month_forecast(model, is_enhanced)
        
        # Format and display the forecast
        forecast_message = format_forecast(next_month, current_month, percentage_change)
        print(forecast_message)
        
        # Save forecast to file
        with open("latest_forecast.txt", "w") as f:
            f.write(forecast_message)
    
    # Check accuracy using historical data
    if args.accuracy_check:
        logging.info("Checking model accuracy on historical data...")
        
        # Prepare scalers
        if is_enhanced:
            scalers = {}
            feature_columns = ['total_expense', 'budget_amount', 'remaining_budget', 'budget_variance_pct']
            
            for feature in feature_columns:
                scalers[feature] = MinMaxScaler(feature_range=(0, 1))
                scalers[feature].fit_transform(data[feature].values.reshape(-1, 1))
        else:
            scaler = MinMaxScaler(feature_range=(0, 1))
            scaler.fit_transform(data['total_expense'].values.reshape(-1, 1))
            scalers = {'total_expense': scaler}
        
        # Evaluate model
        metrics, predictions, actuals = evaluate_model_historical(
            model, data, scalers, is_enhanced
        )
        
        # Print accuracy report
        print_accuracy_report(metrics)
    
    # Perform cross-validation
    if args.cross_validation:
        logging.info("Performing cross-validation...")
        perform_cross_validation(data, is_enhanced, folds=args.folds)

if __name__ == "__main__":
    main()