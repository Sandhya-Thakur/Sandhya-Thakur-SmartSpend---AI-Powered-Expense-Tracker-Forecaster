import subprocess
import time
import logging
import datetime
import os
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
        logging.info(f"Data extraction completed: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"Data extraction failed: {e.stderr}")
        return False

def run_model_training():
    """Run the model training script."""
    logging.info("Starting model training process")
    try:
        result = subprocess.run(
            ["python", "lstm_model.py"], 
            capture_output=True, 
            text=True, 
            check=True
        )
        logging.info(f"Model training completed: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"Model training failed: {e.stderr}")
        return False

def perform_retraining():
    """Execute the full retraining pipeline."""
    logging.info("Starting retraining pipeline")
    
    # Step 1: Run data extraction
    if not run_extract_data():
        logging.error("Retraining pipeline aborted due to data extraction failure")
        return False
    
    # Step 2: Run model training
    if not run_model_training():
        logging.error("Retraining pipeline aborted due to model training failure")
        return False
    
    logging.info("Retraining pipeline completed successfully")
    return True

def run_scheduled_retraining(interval_hours=24):
    """Run the retraining process on a schedule."""
    logging.info(f"Starting scheduled retraining (interval: {interval_hours} hours)")
    
    while True:
        try:
            # Perform the retraining
            perform_retraining()
            
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
def run_once():
    """Run the retraining process once for testing."""
    logging.info("Running one-time retraining process")
    perform_retraining()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Model retraining scheduler')
    parser.add_argument('--once', action='store_true', help='Run once for testing')
    parser.add_argument('--interval', type=float, default=24, help='Retraining interval in hours')
    
    args = parser.parse_args()
    
    if args.once:
        run_once()
    else:
        run_scheduled_retraining(args.interval)