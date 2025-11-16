"""
Pytest configuration for backend tests.

This file configures the Python path so that tests can import from the backend modules.
"""

import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))
