import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt # type: ignore
from sklearn.preprocessing import MinMaxScaler # type: ignore
from sklearn.metrics import mean_squared_error, mean_absolute_error # type: ignore
import torch # type: ignore
import torch.nn as nn # type: ignore
import torch.optim as optim # type: ignore
from torch.utils.data import DataLoader, TensorDataset # type: ignore
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

def load_data(file_path='data/daily_expenses.csv'):
    """Load the preprocessed time series data."""
    try:
        df = pd.read_csv(file_path)
        df['date'] = pd.to_datetime(df['date'])
        logging.info(f"Loaded {len(df)} records from {file_path}")
        return df
    except Exception as e:
        logging.error(f"Error loading data: {e}")
        return None

def prepare_sequences(data, sequence_length=7, test_ratio=0.2):
    """Prepare sequences for LSTM model with train/test split."""
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
    
    return X_train, y_train, X_test, y_test, scaler

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

def evaluate_model(model, X_test, y_test, scaler):
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
        
        # Inverse transform
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

def forecast_future(model, data, scaler, steps=30, sequence_length=7):
    """Generate future predictions beyond the test data."""
    model.eval()
    
    # Get the last sequence from the data
    if len(data) == 0:
        logging.warning("No data available for forecasting")
        return np.array([])
        
    # Handle the dimensionality based on the input data shape
    if isinstance(data, torch.Tensor):
        last_sequence = data[-1].unsqueeze(0)
    else:
        # If data is a DataFrame, create a sequence from the last n rows
        values = data['total_expense'].values[-sequence_length:].reshape(-1, 1)
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
            # Fix the dimensionality issue
            new_input = pred.view(1, 1, 1)
            last_sequence = torch.cat((last_sequence[:, 1:, :], new_input), dim=1)
    
    # Convert predictions back to original scale
    future_predictions = np.array(future_predictions).reshape(-1, 1)
    future_predictions = scaler.inverse_transform(future_predictions)
    
    return future_predictions.flatten()

def save_model(model, model_path="models/lstm_model.pth"):
    """Save the trained model."""
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    torch.save(model.state_dict(), model_path)
    logging.info(f"Model saved to {model_path}")

def plot_results(actual, predicted, train_losses, timestamp):
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
    plt.title('Expense Prediction Results')
    plt.xlabel('Time')
    plt.ylabel('Expense Amount')
    plt.legend()
    plt.grid(True)
    plt.savefig(f'{plots_dir}/prediction_results_{timestamp}.png')
    plt.close()

def main(model_path="models/lstm_model.pth", continuous_learning=True):
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
    
    # Prepare sequences for training
    X_train, y_train, X_test, y_test, scaler = prepare_sequences(data, sequence_length)
    if X_train is None:
        logging.error("Could not prepare training sequences. Exiting.")
        return
        
    logging.info(f"Training data shape: {X_train.shape}, {y_train.shape}")
    logging.info(f"Testing data shape: {X_test.shape}, {y_test.shape}")
    
    # Initialize the model
    model = LSTMModel(input_size=1, hidden_size=hidden_size, num_layers=num_layers)
    
    # If continuous learning is enabled, try to load the existing model
    model_loaded = False
    if continuous_learning:
        model_loaded = load_existing_model(model, model_path)
    
    # Train the model
    model, losses = train_model(model, X_train, y_train, epochs=epochs, batch_size=batch_size)
    
    # Evaluate the model if we have test data
    if len(X_test) > 0:
        actual, predicted = evaluate_model(model, X_test, y_test, scaler)
    else:
        actual, predicted = None, None
    
    # Generate future predictions
    try:
        future_values = forecast_future(model, X_test if len(X_test) > 0 else data, scaler, steps=30, sequence_length=sequence_length)
        
        # Create a plot for future predictions if we have data
        if actual is not None and len(actual) > 0:
            plt.figure(figsize=(12, 6))
            past_days = np.arange(len(actual))
            future_days = np.arange(len(actual), len(actual) + len(future_values))
            
            plt.plot(past_days, actual, label='Actual')
            plt.plot(past_days, predicted, label='Predicted')
            plt.plot(future_days, future_values, 'r--', label='Future Forecast')
            
            plt.title('Expense Forecast')
            plt.xlabel('Days')
            plt.ylabel('Expense Amount')
            plt.legend()
            plt.grid(True)
            plt.savefig(f'plots/expense_forecast_{timestamp}.png')
            plt.close()
    except Exception as e:
        logging.error(f"Error in future forecasting: {e}")
    
    # Plot results if we have actual data
    if actual is not None and len(actual) > 0:
        plot_results(actual, predicted, losses, timestamp)
    
    # Save the model
    save_model(model, model_path)
    
    logging.info("LSTM model training and evaluation completed.")
    
    return model, scaler

if __name__ == "__main__":
    main()