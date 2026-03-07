#!/bin/bash
set -e

echo "Starting build check script..."
echo "Current directory: $(pwd)"
echo "Files in directory:"
ls -la

echo "Python version:"
python --version

echo "Environment variables (redacted):"
env | grep -v "KEY\|SECRET\|PASSWORD" | sort

echo "Checking if application can start..."
python -c "from app.main import app; print('Application import successful')"

echo "Build check complete!" 