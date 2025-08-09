#!/bin/bash

echo "🔧 Setting up Email Configuration for Development Mode"
echo "=================================================="
echo ""

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found in current directory"
    exit 1
fi

echo "📧 To enable real email sending in development mode, you need to:"
echo ""
echo "1. Get a Gmail App Password:"
echo "   - Go to Google Account → Security → 2-Step Verification"
echo "   - Generate App Password for 'Mail'"
echo "   - Copy the 16-character password"
echo ""
echo "2. Update your docker-compose.yml with real credentials:"
echo "   EMAIL_USER: your_actual_email@gmail.com"
echo "   EMAIL_PASS: your_16_char_app_password"
echo ""
echo "3. Restart the app:"
echo "   docker-compose restart app"
echo ""

# Check current email config
echo "🔍 Current email configuration in docker-compose.yml:"
grep -A 2 "EMAIL_USER:" docker-compose.yml || echo "   EMAIL_USER not found"
grep -A 2 "EMAIL_PASS:" docker-compose.yml || echo "   EMAIL_PASS not found"

echo ""
echo "✅ After updating credentials and restarting, the API will:"
echo "   - Actually send emails to users"
echo "   - Return 'OTP sent to email successfully' when email works"
echo "   - Only fall back to console logging if email service fails"
echo ""
echo "💡 Tip: Test with a real email address to verify it's working!" 