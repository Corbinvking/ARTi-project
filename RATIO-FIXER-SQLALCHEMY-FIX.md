# Fix SQLAlchemy Python 3.13 Compatibility

SQLAlchemy 2.0.23 doesn't support Python 3.13. Fix it with one of these:

## Solution 1: Upgrade SQLAlchemy (Quick Fix)

```bash
cd /opt/ratio-fixer
source venv/bin/activate
pip install --upgrade 'sqlalchemy>=2.0.25'
```

## Solution 2: Use Python 3.11 or 3.12 (More Stable)

```bash
# Install Python 3.11
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev

# Recreate venv with Python 3.11
cd /opt/ratio-fixer
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Solution 3: Pin SQLAlchemy to Latest

```bash
cd /opt/ratio-fixer
source venv/bin/activate
pip install 'sqlalchemy>=2.0.30' 'flask-sqlalchemy>=3.1.1'
```



