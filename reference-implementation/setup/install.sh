#!/bin/bash
# =============================================================================
# Model-Forward Clinical Abstraction Platform - Installation Script
# =============================================================================
# This script automates the complete setup process
# Usage: ./setup/install.sh [--skip-db] [--skip-python] [--skip-react]
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_DB=false
SKIP_PYTHON=false
SKIP_REACT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-db)
      SKIP_DB=true
      shift
      ;;
    --skip-python)
      SKIP_PYTHON=true
      shift
      ;;
    --skip-react)
      SKIP_REACT=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Helper functions
print_header() {
  echo -e "${BLUE}============================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  print_header "Checking Prerequisites"

  local all_met=true

  # Check Python
  if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    print_success "Python 3 found: $PYTHON_VERSION"
  else
    print_error "Python 3 not found. Please install Python 3.9+"
    all_met=false
  fi

  # Check Node.js
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
  else
    print_error "Node.js not found. Please install Node.js 18+"
    all_met=false
  fi

  # Check npm
  if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
  else
    print_error "npm not found. Please install npm"
    all_met=false
  fi

  # Check pip
  if command -v pip3 &> /dev/null; then
    print_success "pip3 found"
  else
    print_warning "pip3 not found. Will attempt to use python3 -m pip"
  fi

  if [ "$all_met" = false ]; then
    print_error "Please install missing prerequisites and try again"
    exit 1
  fi

  echo ""
}

# Setup Python environment
setup_python() {
  if [ "$SKIP_PYTHON" = true ]; then
    print_warning "Skipping Python setup"
    return
  fi

  print_header "Setting up Python Environment"

  cd "$PROJECT_ROOT/python"

  # Create virtual environment
  print_info "Creating virtual environment..."
  python3 -m venv venv
  print_success "Virtual environment created"

  # Activate virtual environment
  source venv/bin/activate

  # Upgrade pip
  print_info "Upgrading pip..."
  pip install --upgrade pip > /dev/null 2>&1

  # Install dependencies
  print_info "Installing Python dependencies..."
  pip install flask flask-cors numpy > /dev/null 2>&1
  print_success "Python dependencies installed"

  # Test imports
  print_info "Testing Python modules..."
  python3 -c "import flask; import numpy; from agents import data_agent, abstraction_agent; import chunking" 2>/dev/null && \
    print_success "Python modules verified" || \
    print_warning "Some Python modules may have import issues"

  deactivate

  echo ""
}

# Setup React environment
setup_react() {
  if [ "$SKIP_REACT" = true ]; then
    print_warning "Skipping React setup"
    return
  fi

  print_header "Setting up React Environment"

  cd "$PROJECT_ROOT/react"

  # Install dependencies
  print_info "Installing React dependencies (this may take a few minutes)..."
  npm install > /dev/null 2>&1
  print_success "React dependencies installed"

  # Create .env file if not exists
  if [ ! -f .env ]; then
    print_info "Creating .env file..."
    cat > .env <<EOF
REACT_APP_API_URL=http://localhost:5000/api
EOF
    print_success ".env file created"
  else
    print_info ".env file already exists"
  fi

  echo ""
}

# Setup database (instructions)
setup_database() {
  if [ "$SKIP_DB" = true ]; then
    print_warning "Skipping database setup"
    return
  fi

  print_header "Database Setup Instructions"

  echo ""
  print_info "To set up the Snowflake database:"
  echo ""
  echo "  1. Log in to your Snowflake account"
  echo "  2. Create schemas:"
  echo "     CREATE SCHEMA SILVER;"
  echo "     CREATE SCHEMA GOLD;"
  echo "     CREATE SCHEMA GOLD_AI;"
  echo "     CREATE SCHEMA LEDGER;"
  echo ""
  echo "  3. Run SQL scripts in this order:"
  echo "     - sql/silver/*.sql (8 files)"
  echo "     - sql/gold/*.sql (6 files)"
  echo "     - sql/gold_ai/*.sql (2 files)"
  echo "     - sql/ledger/*.sql (4 files)"
  echo "     - sql/seed_data/*.sql (6 files)"
  echo ""
  print_info "Or use the provided Snowflake setup script:"
  echo "     snowsql -f setup/snowflake_setup.sql"
  echo ""
}

# Create startup scripts
create_startup_scripts() {
  print_header "Creating Startup Scripts"

  cd "$PROJECT_ROOT"

  # Start API script
  cat > start-api.sh <<'EOF'
#!/bin/bash
cd "$(dirname "$0")/python"
source venv/bin/activate
cd api
echo "Starting API on http://localhost:5000..."
python simple_api.py
EOF
  chmod +x start-api.sh
  print_success "Created start-api.sh"

  # Start React script
  cat > start-ui.sh <<'EOF'
#!/bin/bash
cd "$(dirname "$0")/react"
echo "Starting React UI on http://localhost:3000..."
npm start
EOF
  chmod +x start-ui.sh
  print_success "Created start-ui.sh"

  # Start all script
  cat > start-all.sh <<'EOF'
#!/bin/bash
PROJECT_ROOT="$(dirname "$0")"

echo "Starting Model-Forward Clinical Abstraction Platform..."
echo ""

# Start API in background
echo "Starting API..."
"$PROJECT_ROOT/start-api.sh" &
API_PID=$!

# Wait for API to start
sleep 3

# Start React UI
echo "Starting UI..."
"$PROJECT_ROOT/start-ui.sh" &
UI_PID=$!

echo ""
echo "Platform is starting..."
echo "API PID: $API_PID"
echo "UI PID: $UI_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $API_PID $UI_PID; exit" INT
wait
EOF
  chmod +x start-all.sh
  print_success "Created start-all.sh"

  echo ""
}

# Print completion message
print_completion() {
  print_header "Installation Complete!"

  echo ""
  print_success "Setup completed successfully!"
  echo ""
  print_info "Next steps:"
  echo ""
  echo "  1. Set up Snowflake database (see instructions above)"
  echo "  2. Start the API:"
  echo "     ./start-api.sh"
  echo ""
  echo "  3. In a new terminal, start the UI:"
  echo "     ./start-ui.sh"
  echo ""
  echo "  4. Or start everything at once:"
  echo "     ./start-all.sh"
  echo ""
  echo "  5. Open your browser to:"
  echo "     http://localhost:3000"
  echo ""
  print_info "For development guides, see:"
  echo "  - docs/QUICK_START.md - Get running in 5 minutes"
  echo "  - docs/DEVELOPER_GUIDE.md - Understand the architecture"
  echo "  - docs/DOMAIN_EXTENSION.md - Add new clinical domains"
  echo ""
}

# Main installation flow
main() {
  cd "$PROJECT_ROOT"

  print_header "Model-Forward Clinical Abstraction Platform"
  echo ""
  print_info "Project root: $PROJECT_ROOT"
  echo ""

  check_prerequisites
  setup_python
  setup_react
  setup_database
  create_startup_scripts
  print_completion
}

# Run main
main
