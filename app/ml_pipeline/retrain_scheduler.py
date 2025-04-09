
import subprocess
import time
import logging
import datetime
import os
import argparse
from pathlib import Path

# Set up logging
log_dir = Path('logs')
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f"scheduler_{datetime.datetime.now().strftime('%Y%m%d')}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

def run_extract_data():
    """Run the data extraction script."""
    logging.info("Starting data extraction process")
    try:
        result = subprocess.run(
            ["python", "extract_data.py"],
            capture_output=True,
            text=True,
            check=True
        )
        logging.info(f"Data extraction completed successfully")
        logging.debug(f"Data extraction output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"Data extraction failed: {e.stderr}")
        return False

def run_model_training(use_budget_features=True, continuous_learning=True):
    """Run the model training script."""
    logging.info(f"Starting model training process with budget_features={use_budget_features}, continuous_learning={continuous_learning}")
    
    # Build command with appropriate flags
    cmd = ["python", "lstm_model.py"]
    
    if not use_budget_features:
        cmd.append("--no-budget")
    
    if not continuous_learning:
        cmd.append("--no-continuous")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        logging.info(f"Model training completed successfully")
        logging.debug(f"Model training output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"Model training failed: {e.stderr}")
        return False

def run_model_testing():
    """Run the model testing script."""
    logging.info("Starting model testing process")
    try:
        result = subprocess.run(
            ["python", "test_model.py"],
            capture_output=True,
            text=True,
            check=True
        )
        logging.info(f"Model testing completed successfully")
        logging.debug(f"Model testing output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"Model testing failed: {e.stderr}")
        return False

def perform_retraining(use_budget_features=True, continuous_learning=True, test_model=True):
    """Execute the full retraining pipeline."""
    logging.info(f"Starting retraining pipeline (budget={use_budget_features}, continuous={continuous_learning}, test={test_model})")
    
    # Step 1: Run data extraction
    if not run_extract_data():
        logging.error("Retraining pipeline aborted due to data extraction failure")
        return False
    
    # Step 2: Run model training
    if not run_model_training(use_budget_features, continuous_learning):
        logging.error("Retraining pipeline aborted due to model training failure")
        return False
    
    # Step 3: Run model testing (optional)
    if test_model:
        if not run_model_testing():
            logging.warning("Model testing failed, but continuing pipeline")
    
    logging.info("Retraining pipeline completed successfully")
    
    # Generate a timestamp for this successful run
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Create a status file to track the last successful run
    status_dir = Path('status')
    status_dir.mkdir(exist_ok=True)
    
    with open(status_dir / 'last_successful_run.txt', 'w') as f:
        f.write(f"Last successful run: {timestamp}\n")
        f.write(f"Used budget features: {use_budget_features}\n")
        f.write(f"Used continuous learning: {continuous_learning}\n")
    
    return True

def run_scheduled_retraining(interval_hours=24, use_budget_features=True, continuous_learning=True, test_model=True):
    """Run the retraining process on a schedule."""
    logging.info(f"Starting scheduled retraining (interval: {interval_hours} hours, budget={use_budget_features})")
    
    # Track consecutive failures
    consecutive_failures = 0
    max_consecutive_failures = 3
    
    while True:
        try:
            # Perform the retraining
            success = perform_retraining(use_budget_features, continuous_learning, test_model)
            
            if success:
                consecutive_failures = 0
                logging.info("Retraining completed successfully")
            else:
                consecutive_failures += 1
                logging.warning(f"Retraining failed. Consecutive failures: {consecutive_failures}")
                
                # If we have too many consecutive failures, try simpler model
                if consecutive_failures >= max_consecutive_failures and use_budget_features:
                    logging.warning("Too many failures with budget features. Trying simpler model without budget features.")
                    success = perform_retraining(False, continuous_learning, test_model)
                    if success:
                        logging.info("Simpler model without budget features trained successfully.")
                        consecutive_failures = 0
            
            # Log next run time
            next_run = datetime.datetime.now() + datetime.timedelta(hours=interval_hours)
            logging.info(f"Next scheduled run: {next_run}")
            
            # Sleep until next run
            time.sleep(interval_hours * 3600)
        except Exception as e:
            logging.error(f"Error in scheduler: {e}")
            # Wait a bit before trying again
            time.sleep(300)

# For testing purposes, we can also run it once immediately
def run_once(use_budget_features=True, continuous_learning=True, test_model=True):
    """Run the retraining process once for testing."""
    logging.info(f"Running one-time retraining process (budget={use_budget_features}, continuous={continuous_learning})")
    perform_retraining(use_budget_features, continuous_learning, test_model)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Model retraining scheduler')
    parser.add_argument('--once', action='store_true', help='Run once for testing')
    parser.add_argument('--interval', type=float, default=24, help='Retraining interval in hours')
    parser.add_argument('--no-budget', action='store_true', help='Train without budget features')
    parser.add_argument('--no-continuous', action='store_true', help='Start training from scratch')
    parser.add_argument('--no-test', action='store_true', help='Skip testing phase')
    
    args = parser.parse_args()
    
    # Configure parameters
    use_budget_features = not args.no_budget
    continuous_learning = not args.no_continuous
    test_model = not args.no_test
    
    if args.once:
        run_once(use_budget_features, continuous_learning, test_model)
    else:
        run_scheduled_retraining(args.interval, use_budget_features, continuous_learning, test_model)