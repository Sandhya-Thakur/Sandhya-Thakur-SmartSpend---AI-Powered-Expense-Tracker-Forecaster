import os
import psycopg2  # type: ignore
import pandas as pd
import numpy as np
from datetime import datetime
import matplotlib.pyplot as plt  # type: ignore
from dotenv import load_dotenv  # type: ignore # You'll need to install this package

# Load environment variables from .env file
load_dotenv()

def connect_to_db():
    """Connect to the NeonDB PostgreSQL database using environment variables."""
    try:
        # Get database URL from environment variable
        database_url = os.environ.get("DATABASE_URL")
        
        if not database_url:
            raise ValueError("DATABASE_URL environment variable is not set")
        
        print(f"Database URL found: {'Yes' if database_url else 'No'}")
        print("Attempting to connect to the database...")
        
        # Connect using the database URL
        conn = psycopg2.connect(database_url, sslmode='require')
        print("Connected to the NeonDB database successfully.")
        return conn
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        return None

def extract_expense_data(conn):
    """Extract expense data from the database."""
    try:
        print("Executing query to extract expense data...")
        query = """
        SELECT 
            amount, 
            date, 
            category_id, 
            user_id
        FROM expenses
        ORDER BY date ASC
        """
        
        # Execute query and load results into a pandas DataFrame
        df = pd.read_sql_query(query, conn)
        print(f"Extracted {len(df)} expense records.")
        return df
    except Exception as e:
        print(f"Error extracting data: {e}")
        return None

def preprocess_data_for_time_series(df):
    """Preprocess the data for time series analysis."""
    print("Preprocessing data for time series analysis...")
    # Convert date column to datetime
    df['date'] = pd.to_datetime(df['date'])
    
    # Create daily aggregation (sum of expenses per day)
    daily_data = df.groupby(df['date'].dt.date)['amount'].sum().reset_index()
    daily_data.rename(columns={'date': 'date', 'amount': 'total_expense'}, inplace=True)
    
    # Make sure date is datetime type - this is the fix
    daily_data['date'] = pd.to_datetime(daily_data['date'])
    
    # Create weekly aggregation
    df['week'] = df['date'].dt.isocalendar().week
    df['year'] = df['date'].dt.isocalendar().year
    weekly_data = df.groupby(['year', 'week'])['amount'].sum().reset_index()
    weekly_data.rename(columns={'amount': 'total_expense'}, inplace=True)
    
    # Create monthly aggregation
    df['month'] = df['date'].dt.month
    df['year'] = df['date'].dt.year
    monthly_data = df.groupby(['year', 'month'])['amount'].sum().reset_index()
    monthly_data.rename(columns={'amount': 'total_expense'}, inplace=True)
    
    # For LSTM, we'll primarily use daily data
    # Ensure data is sorted by date
    daily_data = daily_data.sort_values('date')
    
    # Fill in missing dates with zeros
    # Create a complete date range
    all_dates = pd.date_range(start=daily_data['date'].min(), end=daily_data['date'].max())
    date_df = pd.DataFrame({'date': all_dates})
    
    # Merge with our actual data - both columns are now datetime type
    complete_daily_data = pd.merge(date_df, daily_data, on='date', how='left')
    complete_daily_data['total_expense'].fillna(0, inplace=True)
    
    print("Data preprocessing completed.")
    return {
        'daily': complete_daily_data,
        'weekly': weekly_data,
        'monthly': monthly_data
    }

def create_sequences(data, sequence_length):
    """Create input sequences for LSTM model."""
    print(f"Creating sequences with length {sequence_length}...")
    X, y = [], []
    data_array = data['total_expense'].values
    for i in range(len(data_array) - sequence_length):
        X.append(data_array[i:i+sequence_length])
        y.append(data_array[i+sequence_length])
    return np.array(X), np.array(y)

def visualize_time_series(data, title):
    """Create a visualization of the time series data."""
    print(f"Creating visualization: {title}")
    plt.figure(figsize=(12, 6))
    plt.plot(data['date'], data['total_expense'])
    plt.title(title)
    plt.xlabel('Date')
    plt.ylabel('Total Expense')
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(f"{title.lower().replace(' ', '_')}.png")
    plt.close()
    print(f"Visualization saved as {title.lower().replace(' ', '_')}.png")

def save_processed_data(processed_data, output_dir="data"):
    """Save the processed data to CSV files."""
    print(f"Saving processed data to {output_dir} directory...")
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")
    
    # Save each dataset
    for data_type, data in processed_data.items():
        data.to_csv(f"{output_dir}/{data_type}_expenses.csv", index=False)
        print(f"Saved {data_type} data to {output_dir}/{data_type}_expenses.csv")

def check_table_exists(conn):
    """Check if the expenses table exists and has data."""
    try:
        with conn.cursor() as cur:
            # Check if table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'expenses'
                );
            """)
            table_exists = cur.fetchone()[0]
            
            if not table_exists:
                print("ERROR: The 'expenses' table does not exist in the database.")
                return False
            
            # Check row count
            cur.execute("SELECT COUNT(*) FROM expenses")
            count = cur.fetchone()[0]
            print(f"Found {count} records in the expenses table")
            
            if count == 0:
                print("WARNING: The 'expenses' table exists but contains no data.")
                return False
                
            return True
    except Exception as e:
        print(f"Error checking expenses table: {e}")
        return False

def main():
    print("Starting data extraction process...")
    
    # Connect to the database
    conn = connect_to_db()
    if not conn:
        print("Failed to connect to the database. Exiting.")
        return
    
    # Check if expenses table exists and has data
    if not check_table_exists(conn):
        conn.close()
        return
    
    try:
        # Extract data
        raw_data = extract_expense_data(conn)
        if raw_data is None or raw_data.empty:
            print("No data extracted. Exiting.")
            return
        
        # Preprocess data
        processed_data = preprocess_data_for_time_series(raw_data)
        
        # Visualize the data
        visualize_time_series(processed_data['daily'], "Daily Expenses Time Series")
        
        # Create sequences for LSTM (example with 7-day sequence)
        sequence_length = 7
        X, y = create_sequences(processed_data['daily'], sequence_length)
        print(f"Created {len(X)} sequences with length {sequence_length} for LSTM training.")
        
        # Save the processed data
        save_processed_data(processed_data)
        
        print("Data extraction and preprocessing completed successfully.")
    except Exception as e:
        print(f"Error in main processing: {e}")
    finally:
        conn.close()
        print("Database connection closed.")

if __name__ == "__main__":
    main()