# 💸 SmartSpend – AI-Powered Expense Tracker & Forecaster

SmartSpend is an intelligent, full-stack expense tracking and forecasting platform that combines modern web development with machine learning. It helps users manage their expenses, predict future spending, detect anomalies, and gain actionable insights — all through a clean, interactive dashboard.

## 🚀 Features

### 🔍 Expense Tracking
- Easy expense entry and management
- Automatic categorization using ML models
- Full CRUD operations with PostgreSQL database

### 📊 Intelligent Insights
- Time-series forecasting with LSTM networks
- Anomaly detection for unusual spending patterns (Isolation Forest)
- Spending pattern analysis with clustering algorithms
- Budget-aware forecasting models

### 🖥️ Dashboard & Visualizations
- Real-time analytics using Recharts
- Predicted vs actual spending trends
- Notifications for spending anomalies
- Personalized financial recommendations

## 🏗️ Tech Stack

### Frontend
- Next.js with TypeScript
- Tailwind CSS for styling
- Recharts for data visualization
- Custom React hooks for data fetching
- Clerk for authentication

### Backend & Data
- Next.js API routes
- NeonDB PostgreSQL database
- Drizzle ORM for database operations
- Data extraction and preprocessing pipeline

### ML Pipeline
- Python with TensorFlow/PyTorch for LSTM models
- Scikit-learn for anomaly detection and classification
- Flask API for serving ML predictions
- Automated model training and retraining

## ✅ Project Status

### Completed
- Database setup and schema design
- LSTM forecasting model with budget integration
- Data extraction and preprocessing pipeline
- Next.js API endpoint integration
- Core React components for dashboard

### In Progress
- Anomaly detection implementation
- Automatic expense categorization
- Spending pattern analysis
- Enhanced budget visualization components

### Next Steps
- Complete ML pipeline with remaining algorithms
- Implement notification system
- Add budget optimization suggestions
- Set up model retraining scheduling

## 🚀 Getting Started

### Prerequisites
- Node.js and npm/yarn
- Python 3.8+ with pip
- PostgreSQL database (NeonDB recommended)
- Clerk account for authentication

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/smartspend.git
cd smartspend

# Install frontend dependencies
npm install

# Set up Python environment
cd ml_pipeline
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start the development server
cd ..
npm run dev
```

### Environment Setup
Create a `.env` file with the following variables:
```
# Database
DATABASE_URL=your_postgres_connection_string

# ML API
ML_API_URL=http://localhost:5000  # or your deployed ML API URL

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## 📊 Project Structure
```
smartspend/
├── app/                         # Next.js application 
│   ├── .clerk                   # Clerk authentication
│   ├── .next                    # Next.js build files
│   ├── api/                     # API routes
│   │   ├── budgets/             # Budget management endpoints
│   │   ├── expenses/            # Expense tracking endpoints
│   │   ├── forecast/            # ML prediction endpoints
│   │   ├── recurring-expenses/  # Recurring expenses endpoints
│   │   ├── statistics/          # Statistical analysis endpoints
│   │   └── user/                # User management endpoints
│   ├── components/              # React components
│   │   ├── budget/              # Budget components
│   │   ├── dashboard/           # Dashboard UI components
│   │   ├── expenses/            # Expense management components
│   │   ├── forms/               # Form components
│   │   ├── insights/            # AI insights components
│   │   │   └── AIInsights.tsx   # ML predictions display
│   │   ├── layout/              # Layout components
│   │   ├── navigation/          # Navigation components
│   │   └── recurring-expenses/  # Recurring expenses components
│   ├── dashboard/               # Dashboard pages
│   │   └── page.tsx             # Main dashboard page
│   ├── expenses/                # Expense pages
│   ├── forecasts/               # Forecast pages
│   ├── sign-in/                 # Authentication pages
│   ├── sign-up/                 # Registration pages
│   ├── lib/                     # Utility libraries
│   │   ├── db/                  # Database connections
│   │   └── hooks/               # Custom React hooks
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── ml_pipeline/                 # Machine learning components
│   ├── __pycache__/             # Python cache
│   ├── .venv/                   # Python virtual environment
│   ├── data/                    # Data storage
│   ├── logs/                    # Log files
│   ├── models/                  # Trained models
│   ├── plots/                   # Generated visualizations
│   ├── status/                  # Status tracking
│   ├── app.py                   # Flask API
│   ├── budget_vs_actual_expenses.png  # Visualization
│   ├── daily_expenses_time_series.png # Time series visualization
│   ├── extract_data.py          # Data extraction pipeline
│   ├── forecast_quality_report.txt    # Model evaluation
│   ├── latest_forecast.txt      # Current predictions
│   ├── lstm_model.py            # LSTM forecasting model
│   ├── model_training.log       # Training logs
│   ├── retrain_scheduler.py     # Model retraining scheduler
│   ├── test_model.py            # Model testing
│   └── update_forecast.py       # Forecast update script
├── node_modules/                # Node dependencies
├── public/                      # Static assets
├── .env                         # Environment variables
├── .gitignore                   # Git ignore file
├── drizzle.config.ts            # Database ORM config
├── eslint.config.mjs            # Linting configuration
├── favicon.ico                  # Site favicon
├── middleware.ts                # Next.js middleware
├── next-env.d.ts                # Next.js type definitions
├── next.config.ts               # Next.js configuration
├── package-lock.json            # Package dependencies lock
├── package.json                 # Project dependencies
├── postcss.config.mjs           # CSS processing config
└── README.md                    # Project documentation
```

