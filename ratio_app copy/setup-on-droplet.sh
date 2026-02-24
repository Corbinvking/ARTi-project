#!/bin/bash
# Setup script for Ratio Fixer on droplet
# Run this from the droplet: bash setup-on-droplet.sh

set -e

echo "🎯 Setting up Ratio Fixer on droplet..."

# Navigate to ratio_app copy directory (adjust path as needed)
cd ~/arti-marketing-ops/ratio_app\ copy || cd ~/arti-marketing-ops/"ratio_app copy" || {
    echo "❌ Error: Could not find ratio_app copy directory"
    echo "Please navigate to the directory containing main.py first"
    exit 1
}

echo "📦 Current directory: $(pwd)"

# Create deployment directory
DEPLOY_DIR="/opt/ratio-fixer"
echo "📁 Creating deployment directory: $DEPLOY_DIR"
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR

# Copy necessary files
echo "📋 Copying application files..."
cp main.py campaign.py jingle_smm.py logger.py requirements.txt $DEPLOY_DIR/

# Copy .env if it exists
if [ -f .env ]; then
    cp .env $DEPLOY_DIR/
    echo "✅ Copied .env file"
else
    echo "⚠️  Warning: .env file not found. You'll need to create it."
fi

# Copy Google Cloud service account if it exists
if [ -f rich-phenomenon-428302-q5-dba5f2f381c1.json ]; then
    cp rich-phenomenon-428302-q5-dba5f2f381c1.json $DEPLOY_DIR/
    echo "✅ Copied Google Cloud service account"
fi

# Copy templates and static if they exist
if [ -d templates ]; then
    cp -r templates $DEPLOY_DIR/
    echo "✅ Copied templates"
fi

if [ -d static ]; then
    cp -r static $DEPLOY_DIR/
    echo "✅ Copied static files"
fi

# Navigate to deployment directory
cd $DEPLOY_DIR

# Create virtual environment
echo "🐍 Creating Python virtual environment..."
python3 -m venv venv

# Activate and install dependencies
echo "📦 Installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your API keys:"
echo "   nano $DEPLOY_DIR/.env"
echo ""
echo "2. Test the application:"
echo "   cd $DEPLOY_DIR"
echo "   source venv/bin/activate"
echo "   python main.py"
echo ""
echo "3. Set up systemd service (see deployment guide)"
echo ""
echo "📁 Files are in: $DEPLOY_DIR"

