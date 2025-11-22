# Fix Python 3.13 Compatibility Issue

The error shows pandas 2.1.4 doesn't support Python 3.13. Here are the solutions:

## Solution 1: Use Python 3.11 or 3.12 (Recommended)

```bash
# Check available Python versions
ls /usr/bin/python*

# Install Python 3.11 if not available
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev

# Recreate virtual environment with Python 3.11
cd /opt/ratio-fixer
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Solution 2: Update pandas to latest version

```bash
# Update requirements.txt to use newer pandas
cd /opt/ratio-fixer
source venv/bin/activate

# Install newer pandas that supports Python 3.13
pip install pandas>=2.2.0

# Or update the requirements.txt file
sed -i 's/pandas==2.1.4/pandas>=2.2.0/' requirements.txt
pip install -r requirements.txt
```

## Solution 3: Use pre-built wheels (if available)

```bash
cd /opt/ratio-fixer
source venv/bin/activate
pip install --only-binary :all: pandas numpy
pip install -r requirements.txt
```

## Quick Fix (Try this first):

```bash
cd /opt/ratio-fixer
source venv/bin/activate

# Install compatible versions
pip install pandas>=2.2.0 numpy>=1.26.0 scikit-learn>=1.3.0
pip install Flask==3.0.0 flask-cors==4.0.0 python-dotenv==1.0.0
pip install google-auth==2.25.2 google-auth-oauthlib==1.2.0 google-auth-httplib2==0.2.0 google-api-python-client==2.110.0
pip install requests==2.31.0 SQLAlchemy==2.0.23 Flask-SQLAlchemy==3.1.1 Flask-Bcrypt==1.0.1 Flask-Login==0.6.3 Flask-Migrate==4.0.5
```



