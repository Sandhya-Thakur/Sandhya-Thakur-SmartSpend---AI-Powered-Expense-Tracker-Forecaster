#!/usr/bin/env python3
# ml_pipeline/update_forecast.py

import os
import sys
import logging
import subprocess
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/forecast_updates.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

def run_forecast_model():
    """Run the forecast model and generate updated forecast"""
    logging.info("Running forecast model update...")
    
    try:
        # Get the directory of this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_script = os.path.join(script_dir, "test_model.py")
        
        # Run the model script
        result = subprocess.run(
            ["python3", model_script, "--forecast-only"], 
            capture_output=True, 
            text=True,
            check=True
        )
        
        # Log the output
        logging.info(f"Forecast model output: {result.stdout}")
        
        # Check if the latest_forecast.txt file exists and was updated
        forecast_file = os.path.join(script_dir, "latest_forecast.txt")
        if os.path.exists(forecast_file):
            mod_time = os.path.getmtime(forecast_file)
            mod_time_str = datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d %H:%M:%S')
            logging.info(f"Forecast file updated at {mod_time_str}")
            
            # Optionally, run the accuracy check too
            run_accuracy_check()
        else:
            logging.error("Forecast file not found after running model")
            
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"Error running forecast model: {e}")
        logging.error(f"stderr: {e.stderr}")
        return False
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        return False

def run_accuracy_check():
    """Run accuracy check on the model"""
    logging.info("Running accuracy check...")
    
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_script = os.path.join(script_dir, "test_model.py")
        
        # Run the accuracy check
        result = subprocess.run(
            ["python3", model_script, "--accuracy-check"], 
            capture_output=True, 
            text=True,
            check=True
        )
        
        logging.info("Accuracy check completed")
        return True
    except Exception as e:
        logging.error(f"Error running accuracy check: {e}")
        return False

if __name__ == "__main__":
    # Create logs directory if it doesn't exist
    os.makedirs("ml_pipeline/logs", exist_ok=True)
    
    logging.info("Starting scheduled forecast update")
    success = run_forecast_model()
    
    if success:
        logging.info("Forecast update completed successfully")
    else:
        logging.error("Forecast update failed")