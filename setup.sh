#!/bin/bash
# BrewBuddy Installation Script for Raspberry Pi

set -e

echo "======================================"
echo "BrewBuddy Installation"
echo "======================================"
echo ""

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo "WARNING: This doesn't appear to be a Raspberry Pi."
    echo "The hardware interface may not work correctly."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✓ Docker installed"
else
    echo "✓ Docker already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo apt-get update
    sudo apt-get install -y docker-compose
    echo "✓ Docker Compose installed"
else
    echo "✓ Docker Compose already installed"
fi

# Enable 1-wire interface for temperature sensors
echo "Configuring 1-wire interface..."
if ! grep -q "dtoverlay=w1-gpio" /boot/config.txt; then
    echo "dtoverlay=w1-gpio,gpiopin=4" | sudo tee -a /boot/config.txt
    echo "✓ 1-wire interface enabled (requires reboot)"
    NEED_REBOOT=true
else
    echo "✓ 1-wire interface already enabled"
fi

# Generate secret key
if [ ! -f .env ]; then
    echo "Generating secret key..."
    SECRET_KEY=$(openssl rand -hex 32)
    cat > .env << EOF
SECRET_KEY=$SECRET_KEY
EOF
    echo "✓ Secret key generated"
else
    echo "✓ .env file already exists"
fi

# Build and start containers
echo ""
echo "Building Docker containers..."
docker-compose build

echo ""
echo "Starting BrewBuddy..."
docker-compose up -d

echo ""
echo "Initializing database..."
docker-compose exec backend python -m app.init_data

echo ""
echo "======================================"
echo "✅ Installation Complete!"
echo "======================================"
echo ""
echo "BrewBuddy is now running!"
echo ""
echo "Access the web interface at:"
echo "  http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Default login credentials:"
echo "  Username: admin"
echo "  Password: admin"
echo ""
echo "⚠️  IMPORTANT: Please change the default password immediately!"
echo ""

if [ "$NEED_REBOOT" = true ]; then
    echo "⚠️  A reboot is required to enable the 1-wire interface."
    read -p "Reboot now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo reboot
    else
        echo "Please reboot manually when convenient."
    fi
fi

echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose stop"
echo "To restart: docker-compose restart"
echo ""


