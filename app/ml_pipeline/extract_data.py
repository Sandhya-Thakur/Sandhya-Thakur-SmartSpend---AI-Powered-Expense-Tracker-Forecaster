import os
import psycopg2  # type: ignore
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
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
            e.amount, 
            e.date, 
            e.category_id, 
            e.user_id,
            e.description,
            c.name as category_name,
            c.color as category_color
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        ORDER BY e.date ASC
        """
        
        # Execute query and load results into a pandas DataFrame
        df = pd.read_sql_query(query, conn)
        print(f"Extracted {len(df)} expense records.")
        return df
    except Exception as e:
        print(f"Error extracting expense data: {e}")
        return None

def extract_budget_data(conn):
    """Extract budget data from the database."""
    try:
        print("Executing query to extract budget data...")
        query = """
        SELECT 
            b.id,
            b.amount, 
            b.period,
            b.start_date,
            b.category_id, 
            b.user_id,
            c.name as category_name
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        ORDER BY b.start_date ASC
        """
        
        # Execute query and load results into a pandas DataFrame
        df = pd.read_sql_query(query, conn)
        print(f"Extracted {len(df)} budget records.")
        return df
    except Exception as e:
        print(f"Error extracting budget data: {e}")
        return None

def extract_recurring_expenses(conn):
    """Extract recurring expense data from the database."""
    try:
        print("Executing query to extract recurring expense data...")
        query = """
        SELECT 
            r.id,
            r.amount, 
            r.description,
            r.frequency,
            r.start_date,
            r.end_date,
            r.category_id, 
            r.user_id,
            c.name as category_name
        FROM recurring_expenses r
        JOIN categories c ON r.category_id = c.id
        ORDER BY r.start_date ASC
        """
        
        # Execute query and load results into a pandas DataFrame
        df = pd.read_sql_query(query, conn)
        print(f"Extracted {len(df)} recurring expense records.")
        return df
    except Exception as e:
        print(f"Error extracting recurring expense data: {e}")
        return None

def preprocess_expense_data(expense_df):
    """Preprocess the expense data for time series analysis."""
    print("Preprocessing expense data for time series analysis...")
    
    if expense_df is None or expense_df.empty:
        print("No expense data to preprocess.")
        return None
    
    # Convert date column to datetime
    expense_df['date'] = pd.to_datetime(expense_df['date'])
    
    # Create daily aggregation (sum of expenses per day)
    daily_data = expense_df.groupby(expense_df['date'].dt.date)['amount'].sum().reset_index()
    daily_data.rename(columns={'date': 'date', 'amount': 'total_expense'}, inplace=True)
    
    # Make sure date is datetime type
    daily_data['date'] = pd.to_datetime(daily_data['date'])
    
    # Create weekly aggregation
    expense_df['week'] = expense_df['date'].dt.isocalendar().week
    expense_df['year'] = expense_df['date'].dt.isocalendar().year
    weekly_data = expense_df.groupby(['year', 'week'])['amount'].sum().reset_index()
    weekly_data.rename(columns={'amount': 'total_expense'}, inplace=True)
    
    # Create monthly aggregation
    expense_df['month'] = expense_df['date'].dt.month
    expense_df['year'] = expense_df['date'].dt.year
    monthly_data = expense_df.groupby(['year', 'month'])['amount'].sum().reset_index()
    monthly_data.rename(columns={'amount': 'total_expense'}, inplace=True)
    
    # Create category-wise aggregation
    category_data = expense_df.groupby(['category_id', 'category_name', 'category_color'])['amount'].sum().reset_index()
    category_data.rename(columns={'amount': 'total_expense'}, inplace=True)
    
    # For LSTM, we'll primarily use daily data
    # Ensure data is sorted by date
    daily_data = daily_data.sort_values('date')
    
    # Fill in missing dates with zeros
    # Create a complete date range
    if len(daily_data) > 0:
        all_dates = pd.date_range(start=daily_data['date'].min(), end=daily_data['date'].max())
        date_df = pd.DataFrame({'date': all_dates})
        
        # Merge with our actual data - both columns are now datetime type
        complete_daily_data = pd.merge(date_df, daily_data, on='date', how='left')
        # Use direct assignment instead of inplace=True
        complete_daily_data['total_expense'] = complete_daily_data['total_expense'].fillna(0)
    else:
        complete_daily_data = daily_data
    
    print("Expense data preprocessing completed.")
    return {
        'daily': complete_daily_data,
        'weekly': weekly_data,
        'monthly': monthly_data,
        'category': category_data
    }

def preprocess_budget_data(budget_df, expense_df):
    """Preprocess the budget data and merge with expense data."""
    print("Preprocessing budget data...")
    
    if budget_df is None or budget_df.empty:
        print("No budget data to preprocess.")
        return None
    
    if expense_df is None or expense_df.empty:
        print("No expense data available to compare with budgets.")
        return None
    
    # Convert date columns to datetime
    budget_df['start_date'] = pd.to_datetime(budget_df['start_date'])
    expense_df['date'] = pd.to_datetime(expense_df['date'])
    
    # Get min and max dates from expense data
    min_date = expense_df['date'].min()
    max_date = expense_df['date'].max()
    
    # Create a daily date range for the analysis period
    date_range = pd.date_range(start=min_date, end=max_date, freq='D')
    date_df = pd.DataFrame({'date': date_range})
    
    # Initialize the budget dataframe we'll build
    budget_daily = date_df.copy()
    budget_daily['budget_amount'] = 0.0
    budget_daily['category_id'] = None
    budget_daily['category_name'] = 'Overall'
    
    # Process each budget entry
    for _, budget in budget_df.iterrows():
        # Determine the budget period and calculate daily budget amount
        period = budget['period']
        start_date = budget['start_date']
        
        # Filter dates for this budget
        if period == 'weekly':
            # Weekly budgets
            days_in_period = 7
            
            # Create sequence of weekly periods
            current_start = start_date
            while current_start <= max_date:
                current_end = current_start + timedelta(days=6)
                
                # Calculate daily allocation
                daily_amount = budget['amount'] / days_in_period
                
                # Add to the budget_daily dataframe
                mask = (budget_daily['date'] >= current_start) & (budget_daily['date'] <= current_end)
                
                # If this is a category-specific budget
                if budget['category_id']:
                    # Create category-specific columns if they don't exist
                    cat_col = f"budget_cat_{budget['category_id']}"
                    if cat_col not in budget_daily.columns:
                        budget_daily[cat_col] = 0.0
                    
                    # Update the category-specific budget
                    budget_daily.loc[mask, cat_col] = daily_amount
                
                # Update the overall budget amount
                budget_daily.loc[mask, 'budget_amount'] += daily_amount
                
                # Move to next period
                current_start += timedelta(days=7)
                
        elif period == 'monthly':
            # Monthly budgets - loop through months
            current_month_start = pd.Timestamp(year=start_date.year, month=start_date.month, day=1)
            
            while current_month_start <= max_date:
                # Get the end of the current month - FIX: Use pandas date logic to avoid invalid dates
                # Use the last day of the month instead of calculating it
                current_month_end = pd.Timestamp(
                    year=current_month_start.year,
                    month=current_month_start.month,
                    day=1
                ) + pd.offsets.MonthEnd(1)
                
                # Get number of days in this month
                days_in_month = (current_month_end - current_month_start).days + 1
                
                # Calculate daily allocation for this month
                daily_amount = budget['amount'] / days_in_month
                
                # Add to the budget_daily dataframe
                mask = (budget_daily['date'] >= current_month_start) & (budget_daily['date'] <= current_month_end)
                
                # If this is a category-specific budget
                if budget['category_id']:
                    # Create category-specific columns if they don't exist
                    cat_col = f"budget_cat_{budget['category_id']}"
                    if cat_col not in budget_daily.columns:
                        budget_daily[cat_col] = 0.0
                    
                    # Update the category-specific budget
                    budget_daily.loc[mask, cat_col] = daily_amount
                
                # Update the overall budget amount
                budget_daily.loc[mask, 'budget_amount'] += daily_amount
                
                # Move to next month - FIX: use pandas date operations to avoid invalid dates
                current_month_start = current_month_start + pd.DateOffset(months=1)
                
        elif period == 'yearly':
            # Yearly budgets - similar approach
            current_year_start = pd.Timestamp(year=start_date.year, month=1, day=1)
            
            while current_year_start <= max_date:
                # Get the end of the current year - FIX: Use pandas date logic
                current_year_end = pd.Timestamp(year=current_year_start.year, month=12, day=31)
                
                # Get number of days in this year (accounting for leap years)
                days_in_year = (current_year_end - current_year_start).days + 1
                
                # Calculate daily allocation for this year
                daily_amount = budget['amount'] / days_in_year
                
                # Add to the budget_daily dataframe
                mask = (budget_daily['date'] >= current_year_start) & (budget_daily['date'] <= current_year_end)
                
                # If this is a category-specific budget
                if budget['category_id']:
                    # Create category-specific columns if they don't exist
                    cat_col = f"budget_cat_{budget['category_id']}"
                    if cat_col not in budget_daily.columns:
                        budget_daily[cat_col] = 0.0
                    
                    # Update the category-specific budget
                    budget_daily.loc[mask, cat_col] = daily_amount
                
                # Update the overall budget amount
                budget_daily.loc[mask, 'budget_amount'] += daily_amount
                
                # Move to next year - FIX: Simpler approach using pandas
                current_year_start = pd.Timestamp(year=current_year_start.year + 1, month=1, day=1)
    
    # Now create expense vs budget dataframe
    # Aggregate expenses by day
    daily_expenses = expense_df.groupby(expense_df['date'].dt.date)['amount'].sum().reset_index()
    daily_expenses.rename(columns={'date': 'date', 'amount': 'expense_amount'}, inplace=True)
    daily_expenses['date'] = pd.to_datetime(daily_expenses['date'])
    
    # Merge budget with expenses
    expense_vs_budget = pd.merge(budget_daily, daily_expenses, on='date', how='left')
    expense_vs_budget['expense_amount'] = expense_vs_budget['expense_amount'].fillna(0)
    
    # Calculate remaining budget and variance
    expense_vs_budget['remaining_budget'] = expense_vs_budget['budget_amount'] - expense_vs_budget['expense_amount']
    expense_vs_budget['budget_variance_pct'] = (expense_vs_budget['expense_amount'] / expense_vs_budget['budget_amount']) * 100
    expense_vs_budget['budget_variance_pct'].replace([np.inf, -np.inf], np.nan, inplace=True)
    expense_vs_budget['budget_variance_pct'] = expense_vs_budget['budget_variance_pct'].fillna(0)
    
    # Calculate cumulative values by month for trending
    expense_vs_budget['year_month'] = expense_vs_budget['date'].dt.to_period('M')
    monthly_budget = expense_vs_budget.groupby('year_month').agg(
        budget_amount=('budget_amount', 'sum'),
        expense_amount=('expense_amount', 'sum')
    ).reset_index()
    monthly_budget['year_month'] = monthly_budget['year_month'].dt.to_timestamp()
    monthly_budget['budget_used_pct'] = (monthly_budget['expense_amount'] / monthly_budget['budget_amount']) * 100
    monthly_budget['budget_used_pct'].replace([np.inf, -np.inf], np.nan, inplace=True)
    monthly_budget['budget_used_pct'] = monthly_budget['budget_used_pct'].fillna(0)
    
    # Also aggregate by category (if we have category-specific budgets)
    category_cols = [col for col in budget_daily.columns if col.startswith('budget_cat_')]
    
    # Initialize category budget mapping
    category_budget_mapping = {}
    
    if category_cols:
        print(f"Found {len(category_cols)} category-specific budgets")
        
        # For each category column, create a separate expense vs budget analysis
        category_budget_data = {}
        
        for cat_col in category_cols:
            cat_id = cat_col.replace('budget_cat_', '')
            
            # Get expenses for this category
            cat_expenses = expense_df[expense_df['category_id'] == cat_id]
            
            if not cat_expenses.empty:
                # Aggregate by day
                cat_daily_exp = cat_expenses.groupby(cat_expenses['date'].dt.date)['amount'].sum().reset_index()
                cat_daily_exp.rename(columns={'date': 'date', 'amount': 'expense_amount'}, inplace=True)
                cat_daily_exp['date'] = pd.to_datetime(cat_daily_exp['date'])
                
                # Create a budget vs expense for this category
                cat_budget = budget_daily[['date', cat_col]].copy()
                cat_budget.rename(columns={cat_col: 'budget_amount'}, inplace=True)
                
                # Merge with expenses
                cat_ev_budget = pd.merge(cat_budget, cat_daily_exp, on='date', how='left')
                cat_ev_budget['expense_amount'] = cat_ev_budget['expense_amount'].fillna(0)
                
                # Calculate metrics
                cat_ev_budget['remaining_budget'] = cat_ev_budget['budget_amount'] - cat_ev_budget['expense_amount']
                cat_ev_budget['budget_variance_pct'] = (cat_ev_budget['expense_amount'] / cat_ev_budget['budget_amount']) * 100
                cat_ev_budget['budget_variance_pct'].replace([np.inf, -np.inf], np.nan, inplace=True)
                cat_ev_budget['budget_variance_pct'] = cat_ev_budget['budget_variance_pct'].fillna(0)
                
                # Store in our dictionary
                category_budget_data[cat_id] = cat_ev_budget
                
                # Add to our mapping for reference
                cat_name = expense_df[expense_df['category_id'] == cat_id]['category_name'].iloc[0] if not expense_df[expense_df['category_id'] == cat_id].empty else 'Unknown'
                category_budget_mapping[cat_id] = cat_name
    
    print("Budget data preprocessing completed.")
    return {
        'daily_budget': budget_daily,
        'expense_vs_budget': expense_vs_budget,
        'monthly_budget': monthly_budget,
        'category_budget_mapping': category_budget_mapping
    }

def combine_expense_and_budget_data(expense_data, budget_data):
    """Combine expense and budget data for machine learning."""
    if expense_data is None or 'daily' not in expense_data or expense_data['daily'].empty:
        print("No expense data available to combine with budget data.")
        return None
    
    if budget_data is None or 'expense_vs_budget' not in budget_data or budget_data['expense_vs_budget'].empty:
        print("No budget data available to combine with expense data.")
        # Return just the expense data if no budget data
        return expense_data['daily']
    
    # Get the relevant dataframes
    daily_expenses = expense_data['daily']
    expense_vs_budget = budget_data['expense_vs_budget']
    
    # Merge the datasets
    combined_data = pd.merge(daily_expenses, 
                            expense_vs_budget[['date', 'budget_amount', 'remaining_budget', 'budget_variance_pct']], 
                            on='date', 
                            how='left')
    
    # Fill NA values (days with no budget)
    combined_data['budget_amount'] = combined_data['budget_amount'].fillna(0)
    combined_data['remaining_budget'] = combined_data['remaining_budget'].fillna(0)
    combined_data['budget_variance_pct'] = combined_data['budget_variance_pct'].fillna(0)
    
    print(f"Combined data has {len(combined_data)} rows and {combined_data.columns.size} columns")
    return combined_data

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

def visualize_budget_vs_expenses(data, title="Budget vs Actual Expenses"):
    """Create a visualization comparing budget to actual expenses."""
    if 'budget_amount' not in data.columns or 'expense_amount' not in data.columns:
        print("Data doesn't contain required budget columns for visualization.")
        return
    
    print(f"Creating visualization: {title}")
    plt.figure(figsize=(14, 8))
    
    # Group by month for better visualization
    data['year_month'] = data['date'].dt.to_period('M')
    monthly_data = data.groupby('year_month').agg(
        budget_amount=('budget_amount', 'sum'),
        expense_amount=('expense_amount', 'sum')
    ).reset_index()
    monthly_data['year_month'] = monthly_data['year_month'].dt.to_timestamp()
    
    # Plot
    plt.bar(monthly_data['year_month'], monthly_data['budget_amount'], alpha=0.6, color='blue', label='Budget')
    plt.bar(monthly_data['year_month'], monthly_data['expense_amount'], alpha=0.6, color='red', label='Actual Expenses')
    
    plt.title(title)
    plt.xlabel('Month')
    plt.ylabel('Amount')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    filename = f"{title.lower().replace(' ', '_')}.png"
    plt.savefig(filename)
    plt.close()
    print(f"Visualization saved as {filename}")

def save_processed_data(processed_data, output_dir="data"):
    """Save the processed data to CSV files."""
    print(f"Saving processed data to {output_dir} directory...")
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")
    
    # Save each dataset
    if isinstance(processed_data, dict):
        for data_type, data in processed_data.items():
            if data is not None and not isinstance(data, dict):  # Skip nested dictionaries
                filename = f"{output_dir}/{data_type}_expenses.csv"
                data.to_csv(filename, index=False)
                print(f"Saved {data_type} data to {filename}")
    else:
        # Handle the case where processed_data is a single DataFrame
        filename = f"{output_dir}/combined_data.csv"
        processed_data.to_csv(filename, index=False)
        print(f"Saved combined data to {filename}")

def check_tables_exist(conn):
    """Check if the necessary tables exist and have data."""
    tables_to_check = ['expenses', 'budgets', 'categories', 'recurring_expenses']
    results = {}
    
    try:
        with conn.cursor() as cur:
            for table in tables_to_check:
                # Check if table exists
                cur.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    );
                """)
                table_exists = cur.fetchone()[0]
                
                if not table_exists:
                    print(f"WARNING: The '{table}' table does not exist in the database.")
                    results[table] = {'exists': False, 'count': 0}
                    continue
                
                # Check row count
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                print(f"Found {count} records in the {table} table")
                
                results[table] = {'exists': True, 'count': count}
            
            return results
    except Exception as e:
        print(f"Error checking tables: {e}")
        return None

def main():
    print("Starting data extraction process...")
    
    # Connect to the database
    conn = connect_to_db()
    if not conn:
        print("Failed to connect to the database. Exiting.")
        return
    
    # Check if tables exist and have data
    table_status = check_tables_exist(conn)
    if not table_status:
        conn.close()
        return
    
    # Check if at least the expenses table has data
    if not table_status['expenses']['exists'] or table_status['expenses']['count'] == 0:
        print("The expenses table doesn't exist or has no data. Exiting.")
        conn.close()
        return
    
    try:
        # Extract expense data
        expense_data_df = extract_expense_data(conn)
        if expense_data_df is None or expense_data_df.empty:
            print("No expense data extracted. Exiting.")
            return
        
        # Extract budget data if available
        budget_data_df = None
        if table_status['budgets']['exists'] and table_status['budgets']['count'] > 0:
            budget_data_df = extract_budget_data(conn)
        else:
            print("No budget data available.")
        
        # Extract recurring expenses if available
        recurring_data_df = None
        if table_status['recurring_expenses']['exists'] and table_status['recurring_expenses']['count'] > 0:
            recurring_data_df = extract_recurring_expenses(conn)
        else:
            print("No recurring expense data available.")
        
        # Preprocess expense data
        processed_expense_data = preprocess_expense_data(expense_data_df)
        
        # Preprocess budget data if available
        processed_budget_data = None
        if budget_data_df is not None and not budget_data_df.empty:
            processed_budget_data = preprocess_budget_data(budget_data_df, expense_data_df)
        
        # Combine data for machine learning
        combined_data = combine_expense_and_budget_data(processed_expense_data, processed_budget_data)
        
        # Visualize the data
        if processed_expense_data and 'daily' in processed_expense_data and not processed_expense_data['daily'].empty:
            visualize_time_series(processed_expense_data['daily'], "Daily Expenses Time Series")
        
        # Visualize budget vs expenses if available
        if processed_budget_data and 'expense_vs_budget' in processed_budget_data and not processed_budget_data['expense_vs_budget'].empty:
            visualize_budget_vs_expenses(processed_budget_data['expense_vs_budget'])
        
        # Create sequences for LSTM (example with 7-day sequence)
        if combined_data is not None and not combined_data.empty and len(combined_data) > 7:
            sequence_length = 7
            X, y = create_sequences(combined_data, sequence_length)
            print(f"Created {len(X)} sequences with length {sequence_length} for LSTM training.")
        
        # Save the processed data
        if processed_expense_data:
            save_processed_data(processed_expense_data)
        
        if processed_budget_data:
            save_processed_data(processed_budget_data, output_dir="data/budget")
        
        if combined_data is not None and not combined_data.empty:
            save_processed_data(combined_data, output_dir="data/combined")
        
        print("Data extraction and preprocessing completed successfully.")
    except Exception as e:
        print(f"Error in main processing: {e}")
    finally:
        conn.close()
        print("Database connection closed.")

if __name__ == "__main__":
    main()