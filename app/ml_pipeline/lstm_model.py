import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import datetime
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('model_training.log'),
        logging.StreamHandler()
    ]
)

# Set random seeds for reproducibility
np.random.seed(42)
torch.manual_seed(42)

class LSTMModel(nn.Module):
    def __init__(self, input_size=1, hidden_size=50, num_layers=1, output_size=1):
        super(LSTMModel, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.input_size = input_size  # Store input_size for later reference
        
        # LSTM layer
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        
        # Fully connected layer
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        # Initialize hidden state and cell state
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        # Forward propagate LSTM
        out, _ = self.lstm(x, (h0, c0))
        
        # Get the output from the last time step
        out = self.fc(out[:, -1, :])
        return out

class EnhancedLSTMModel(nn.Module):
    def __init__(self, input_size=4, hidden_size=64, num_layers=2, output_size=1):
        super(EnhancedLSTMModel, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.input_size = input_size  # Store input_size for later reference
        
        # LSTM layer with multiple features
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        
        # Additional fully connected layers for better feature extraction
        self.fc1 = nn.Linear(hidden_size, hidden_size // 2)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.2)
        self.fc2 = nn.Linear(hidden_size // 2, output_size)
    
    def forward(self, x):
        # Initialize hidden state and cell state
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        # Forward propagate LSTM
        out, _ = self.lstm(x, (h0, c0))
        
        # Apply fully connected layers to the output from the last time step
        out = self.fc1(out[:, -1, :])
        out = self.relu(out)
        out = self.dropout(out)
        out = self.fc2(out)
        return out

def load_data(file_path='data/combined/combined_data.csv'):
    """Load the preprocessed combined expense and budget data."""
    try:
        df = pd.read_csv(file_path)
        
        # Check if the combined data exists, if not, fall back to just expense data
        if not os.path.exists(file_path):
            logging.warning(f"Combined data file not found at {file_path}. Falling back to expense data.")
            file_path = 'data/daily_expenses.csv'
            df = pd.read_csv(file_path)
        
        # Convert date columns to datetime
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
        
        logging.info(f"Loaded {len(df)} records from {file_path}")
        logging.info(f"Columns in data: {df.columns.tolist()}")
        
        return df
    except Exception as e:
        logging.error(f"Error loading data: {e}")
        return None

def prepare_sequences(data, sequence_length=7, test_ratio=0.2, use_budget_features=True):
    """Prepare sequences for LSTM model with train/test split."""
    # Check if we have budget features
    budget_features_exist = all(col in data.columns for col in ['budget_amount', 'remaining_budget', 'budget_variance_pct'])
    
    if use_budget_features and budget_features_exist:
        logging.info("Using budget features in the model")
        # Select features for multivariate analysis
        feature_columns = ['total_expense', 'budget_amount', 'remaining_budget', 'budget_variance_pct']
        
        # Create a copy of the selected features
        features_df = data[feature_columns].copy()
        
        # Check for and handle NaN values
        if features_df.isnull().values.any():
            logging.warning(f"Found NaN values in the data. Filling with zeros.")
            features_df.fillna(0, inplace=True)
        
        # Scale each feature separately
        scalers = {}
        scaled_features = {}
        
        for feature in feature_columns:
            scalers[feature] = MinMaxScaler(feature_range=(0, 1))
            scaled_features[feature] = scalers[feature].fit_transform(features_df[feature].values.reshape(-1, 1))
        
        # Create sequences with multiple features
        X, y = [], []
        for i in range(len(scaled_features['total_expense']) - sequence_length):
            # Create a sequence with all features
            sequence = np.column_stack([scaled_features[feature][i:i+sequence_length] for feature in feature_columns])
            X.append(sequence)
            
            # Target is always the next expense amount
            y.append(scaled_features['total_expense'][i+sequence_length])
        
        X = np.array(X)
        y = np.array(y)
        
        # Record shapes for debugging
        logging.info(f"Multivariate X shape: {X.shape}, y shape: {y.shape}")
        
        # If we have very little data, handle edge cases
        if len(X) <= 1:
            if len(X) == 1:
                X = np.repeat(X, 2, axis=0)
                y = np.repeat(y, 2, axis=0)
            else:
                logging.warning("Not enough data for sequences. Need more records.")
                return None, None, None, None, None
        
        # Determine train/test split point
        split_idx = int(len(X) * (1 - test_ratio))
        split_idx = max(1, split_idx)  # Ensure at least one sample for training
        
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # Convert to PyTorch tensors
        X_train = torch.FloatTensor(X_train)
        y_train = torch.FloatTensor(y_train)
        X_test = torch.FloatTensor(X_test)
        y_test = torch.FloatTensor(y_test)
        
        return X_train, y_train, X_test, y_test, scalers
    else:
        # Fallback to univariate analysis (original implementation)
        logging.info("Using univariate analysis (no budget features or use_budget_features=False)")
        
        # Extract the target variable
        values = data['total_expense'].values.reshape(-1, 1)
        
        # Scale the data
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_values = scaler.fit_transform(values)
        
        # Create sequences
        X, y = [], []
        for i in range(len(scaled_values) - sequence_length):
            X.append(scaled_values[i:i+sequence_length])
            y.append(scaled_values[i+sequence_length])
        
        X = np.array(X)
        y = np.array(y)
        
        # If we have very little data, we might need to handle edge cases
        if len(X) <= 1:
            # Just for testing, duplicate the single sequence we have
            if len(X) == 1:
                X = np.repeat(X, 2, axis=0)
                y = np.repeat(y, 2, axis=0)
            else:
                logging.warning("Not enough data for sequences. Need more expense records.")
                return None, None, None, None, None
        
        # Determine train/test split point
        split_idx = int(len(X) * (1 - test_ratio))
        split_idx = max(1, split_idx)  # Ensure at least one sample for training
        
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # Convert to PyTorch tensors
        X_train = torch.FloatTensor(X_train)
        y_train = torch.FloatTensor(y_train)
        X_test = torch.FloatTensor(X_test)
        y_test = torch.FloatTensor(y_test)
        
        # Create a dictionary with just the expense scaler for consistency
        scalers = {'total_expense': scaler}
        
        return X_train, y_train, X_test, y_test, scalers

def load_existing_model(model, model_path):
    """Load an existing model if available."""
    if os.path.exists(model_path):
        try:
            model.load_state_dict(torch.load(model_path))
            logging.info(f"Loaded existing model from {model_path}")
            return True
        except Exception as e:
            logging.warning(f"Could not load existing model: {e}")
    return False

def train_model(model, X_train, y_train, epochs=50, batch_size=16, learning_rate=0.001):
    """Train the LSTM model."""
    # Define loss function and optimizer
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    # Handle small batch sizes
    batch_size = min(batch_size, len(X_train))
    
    # Create DataLoader for batch processing
    train_dataset = TensorDataset(X_train, y_train)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    
    # Training loop
    model.train()
    losses = []
    
    for epoch in range(epochs):
        epoch_loss = 0
        for X_batch, y_batch in train_loader:
            # Forward pass
            outputs = model(X_batch)
            loss = criterion(outputs, y_batch)
            
            # Backward and optimize
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            
        avg_loss = epoch_loss / len(train_loader)
        losses.append(avg_loss)
        
        # Print progress
        if (epoch + 1) % 10 == 0:
            logging.info(f'Epoch [{epoch+1}/{epochs}], Loss: {avg_loss:.4f}')
    
    return model, losses

def evaluate_model(model, X_test, y_test, scalers):
    """Evaluate the trained model on test data."""
    model.eval()
    with torch.no_grad():
        if len(X_test) == 0:
            logging.warning("No test data available for evaluation")
            return None, None
            
        # Make predictions
        y_pred = model(X_test)
        
        # Convert predictions back to original scale
        y_pred_np = y_pred.numpy()
        y_test_np = y_test.numpy()
        
        # Inverse transform to get actual expense values
        scaler = scalers['total_expense']
        y_pred_original = scaler.inverse_transform(y_pred_np)
        y_test_original = scaler.inverse_transform(y_test_np)
        
        # Calculate metrics
        mse = mean_squared_error(y_test_original, y_pred_original)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test_original, y_pred_original)
        
        logging.info(f"Test MSE: {mse:.4f}")
        logging.info(f"Test RMSE: {rmse:.4f}")
        logging.info(f"Test MAE: {mae:.4f}")
        
        return y_test_original, y_pred_original

def forecast_future(model, data, scalers, steps=30, sequence_length=7, use_budget_features=True):
    """Generate future predictions beyond the test data."""
    model.eval()
    
    # Check if model is multivariate or univariate based on input_size attribute
    is_multivariate = hasattr(model, 'input_size') and model.input_size > 1
    
    # Check if we have budget features in our data
    budget_features_exist = isinstance(data, pd.DataFrame) and all(col in data.columns 
                                                                 for col in ['budget_amount', 'remaining_budget', 'budget_variance_pct'])
    
    # Determine whether to use multivariate forecasting based on model type and data availability
    use_multivariate = is_multivariate and budget_features_exist
    
    if use_multivariate and isinstance(data, pd.DataFrame):
        logging.info("Using multivariate forecasting with budget features")
        
        # Feature columns must match what was used in training
        feature_columns = ['total_expense', 'budget_amount', 'remaining_budget', 'budget_variance_pct']
        
        # Get the last sequence of all features
        last_sequence = {}
        for feature in feature_columns:
            values = data[feature].values[-sequence_length:].reshape(-1, 1)
            last_sequence[feature] = scalers[feature].transform(values)
        
        # Stack all features into a single sequence
        stacked_sequence = np.column_stack([last_sequence[feature] for feature in feature_columns])
        current_sequence = torch.FloatTensor(stacked_sequence).unsqueeze(0)  # Add batch dimension
        
        # For future forecasting, we need to also forecast future budget values
        # For simplicity, we'll use the last budget values for all future steps
        # Extract scalar values properly to avoid dimensionality issues
        last_budget_amount = float(last_sequence['budget_amount'][-1][0])
        last_remaining_budget = float(last_sequence['remaining_budget'][-1][0])
        last_budget_variance = float(last_sequence['budget_variance_pct'][-1][0])
        
        future_predictions = []
        
        # Generate predictions step by step
        for _ in range(steps):
            with torch.no_grad():
                # Get prediction for next step expense
                pred = model(current_sequence)
                future_predictions.append(pred.item())
                
                # Update sequence by removing the first step and adding the prediction
                # For expense, use the predicted value
                # For budget features, use the last values with proper scalar values
                new_step = np.array([[
                    pred.item(), 
                    last_budget_amount, 
                    last_remaining_budget, 
                    last_budget_variance
                ]])
                new_step_tensor = torch.FloatTensor(new_step)
                
                # Remove the first timestep and add the new step
                current_sequence = torch.cat((current_sequence[:, 1:, :], new_step_tensor.unsqueeze(1)), dim=1)
    else:
        # If the model is multivariate but we can't use multivariate forecasting, log a warning
        if is_multivariate:
            logging.warning("Model was trained with multiple features but we're forecasting without them. Results may be inaccurate.")
            return np.array([])
            
        logging.info("Using univariate forecasting (no budget features)")
        # Get the last sequence from the data
        if isinstance(data, pd.DataFrame) and len(data) == 0:
            logging.warning("No data available for forecasting")
            return np.array([])
            
        # Handle the dimensionality based on the input data shape
        if isinstance(data, torch.Tensor):
            last_sequence = data[-1].unsqueeze(0)
        else:
            # If data is a DataFrame, create a sequence from the last n rows
            values = data['total_expense'].values[-sequence_length:].reshape(-1, 1)
            scaler = scalers['total_expense']
            scaled_values = scaler.transform(values)
            last_sequence = torch.FloatTensor(scaled_values).unsqueeze(0)
        
        future_predictions = []
        
        # Generate predictions step by step
        for _ in range(steps):
            with torch.no_grad():
                # Get prediction for next step
                pred = model(last_sequence)
                future_predictions.append(pred.item())
                
                # Update sequence by removing first element and adding the prediction
                new_input = pred.view(1, 1, 1)
                last_sequence = torch.cat((last_sequence[:, 1:, :], new_input), dim=1)
    
    # Convert predictions back to original scale
    future_predictions = np.array(future_predictions).reshape(-1, 1)
    future_predictions = scalers['total_expense'].inverse_transform(future_predictions)
    
    return future_predictions.flatten()

def save_model(model, model_path="models/lstm_model.pth"):
    """Save the trained model."""
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    torch.save(model.state_dict(), model_path)
    logging.info(f"Model saved to {model_path}")

def plot_results(actual, predicted, train_losses, timestamp, with_budget=False):
    """Plot the training loss and prediction results with timestamp."""
    # Create directory for plots
    plots_dir = 'plots'
    os.makedirs('plots', exist_ok=True)
    
    # Only create plots if we have actual data
    if actual is None or len(actual) == 0:
        logging.warning("No data available for plotting results")
        return
    
    # Plot training loss
    plt.figure(figsize=(10, 5))
    plt.plot(train_losses)
    plt.title('Training Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.grid(True)
    plt.savefig(f'{plots_dir}/training_loss_{timestamp}.png')
    plt.close()
    
    # Plot actual vs predicted values
    plt.figure(figsize=(12, 6))
    plt.plot(actual, label='Actual')
    plt.plot(predicted, label='Predicted')
    model_type = "with_budget" if with_budget else "without_budget"
    plt.title(f'Expense Prediction Results ({model_type})')
    plt.xlabel('Time')
    plt.ylabel('Expense Amount')
    plt.legend()
    plt.grid(True)
    plt.savefig(f'{plots_dir}/prediction_results_{model_type}_{timestamp}.png')
    plt.close()

def main(model_path="models/lstm_model.pth", continuous_learning=True, use_budget_features=True):
    # Generate timestamp for this training run
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    logging.info(f"Starting model training run at {timestamp}")
    
    # Load the preprocessed data
    data = load_data()
    if data is None:
        return
    
    # Configuration
    sequence_length = 7  # 7 days of historical data to predict the next day
    batch_size = 16
    hidden_size = 64
    num_layers = 2
    epochs = 100
    
    # Check if we have budget features
    budget_features_exist = all(col in data.columns for col in ['budget_amount', 'remaining_budget', 'budget_variance_pct'])
    actual_use_budget = use_budget_features and budget_features_exist
    
    # Prepare sequences for training
    X_train, y_train, X_test, y_test, scalers = prepare_sequences(
        data, 
        sequence_length, 
        use_budget_features=actual_use_budget
    )
    
    if X_train is None:
        logging.error("Could not prepare training sequences. Exiting.")
        return
    
    # Determine input size based on whether we're using budget features
    input_size = X_train.shape[2] if len(X_train.shape) > 2 else 1
    logging.info(f"Using input size: {input_size} ({'with' if actual_use_budget else 'without'} budget features)")
    
    logging.info(f"Training data shape: {X_train.shape}, {y_train.shape}")
    logging.info(f"Testing data shape: {X_test.shape}, {y_test.shape}")
    
    # Initialize the appropriate model based on input features
    if actual_use_budget:
        model = EnhancedLSTMModel(input_size=input_size, hidden_size=hidden_size, num_layers=num_layers)
        model_path = "models/enhanced_lstm_model.pth"  # Different path for the enhanced model
    else:
        model = LSTMModel(input_size=input_size, hidden_size=hidden_size, num_layers=num_layers)
    
    # If continuous learning is enabled, try to load the existing model
    model_loaded = False
    if continuous_learning:
        model_loaded = load_existing_model(model, model_path)
    
    # Train the model
    model, losses = train_model(model, X_train, y_train, epochs=epochs, batch_size=batch_size)
    
    # Evaluate the model if we have test data
    if len(X_test) > 0:
        actual, predicted = evaluate_model(model, X_test, y_test, scalers)
    else:
        actual, predicted = None, None
    
    # Generate future predictions
    try:
        future_values = forecast_future(
            model, 
            data, 
            scalers, 
            steps=30, 
            sequence_length=sequence_length,
            use_budget_features=actual_use_budget
        )
        
        # Create a plot for future predictions if we have data
        if future_values is not None and len(future_values) > 0:
            plt.figure(figsize=(12, 6))
            
            # Plot historical data if available
            if actual is not None and len(actual) > 0:
                past_days = np.arange(len(actual))
                plt.plot(past_days, actual, label='Actual')
                plt.plot(past_days, predicted, label='Predicted')
                
                # Future days start after the last historical day
                future_days = np.arange(len(actual), len(actual) + len(future_values))
            else:
                # If no historical data, just plot the future predictions
                future_days = np.arange(len(future_values))
            
            plt.plot(future_days, future_values, 'r--', label='Future Forecast')
            
            model_type = "with_budget" if actual_use_budget else "without_budget"
            plt.title(f'Expense Forecast ({model_type})')
            plt.xlabel('Days')
            plt.ylabel('Expense Amount')
            plt.legend()
            plt.grid(True)
            plt.savefig(f'plots/expense_forecast_{model_type}_{timestamp}.png')
            plt.close()
            
            logging.info(f"Future forecast generated for {len(future_values)} days")
    except Exception as e:
        logging.error(f"Error in future forecasting: {e}")
        import traceback
        logging.error(traceback.format_exc())
    
    # Plot results if we have actual data
    if actual is not None and len(actual) > 0:
        plot_results(actual, predicted, losses, timestamp, with_budget=actual_use_budget)
    
    # Save the model
    save_model(model, model_path)
    
    logging.info(f"LSTM model training and evaluation completed. Used budget features: {actual_use_budget}")
    
    return model, scalers

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Train LSTM model for expense prediction')
    parser.add_argument('--no-budget', action='store_true', help='Train model without budget features')
    parser.add_argument('--no-continuous', action='store_true', help='Start training from scratch')
    
    args = parser.parse_args()
    
    main(
        continuous_learning=not args.no_continuous,
        use_budget_features=not args.no_budget
    )