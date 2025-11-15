#!/bin/bash
# ============================================================================
# Quick Demo Launcher - No Database Required
# ============================================================================
# This script starts the platform in demo mode with stub data
# Perfect for presentations and concept validation
# ============================================================================

echo "🎯 Starting Clinical Abstraction Platform (Demo Mode)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ No database required - using stub data"
echo "✅ 6 test cases available"
echo "✅ Full UI and workflow functional"
echo ""
echo "Starting services..."
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if setup has been run
if [ ! -d "python/venv" ] || [ ! -d "react/node_modules" ]; then
    echo "⚠️  First time setup required"
    echo ""
    echo "Run this first:"
    echo "  ./setup/install.sh"
    echo ""
    exit 1
fi

# Start API in background
echo "🔧 Starting API server..."
cd python/api
../venv/bin/activate
python simple_api.py &
API_PID=$!
cd ../..

# Wait for API to start
sleep 3

# Check if API is running
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ API started at http://localhost:5000"
else
    echo "❌ API failed to start"
    exit 1
fi

# Start React UI
echo "🎨 Starting React UI..."
cd react
npm start &
UI_PID=$!
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Demo Ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Open in browser: http://localhost:3000"
echo "🔌 API endpoints: http://localhost:5000/api"
echo ""
echo "📋 Available test cases:"
echo "  1. John Doe - Clear Positive CLABSI"
echo "  2. Jane Smith - Clear Negative"
echo "  3. Robert Johnson - Borderline Case"
echo "  4. Maria Garcia - Missing Data"
echo "  5. David Wilson - Contamination vs Infection"
echo "  6. Sarah Martinez - Multi-Organism"
echo ""
echo "💡 Demo Tips:"
echo "  - Start with PAT001 (John Doe) for best example"
echo "  - Show timeline, signals, and QA panels"
echo "  - Submit feedback to demonstrate full workflow"
echo ""
echo "🛑 To stop: Press Ctrl+C"
echo ""

# Wait for interrupt
trap "echo ''; echo '🛑 Stopping services...'; kill $API_PID $UI_PID 2>/dev/null; echo '✅ Demo stopped'; exit" INT TERM

# Keep script running
wait
