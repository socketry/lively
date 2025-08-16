#!/bin/bash

# Script to install git hooks for CS2D project

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GIT_DIR="$(cd "$PROJECT_DIR/../.." && pwd)/.git"

if [ ! -d "$GIT_DIR" ]; then
    echo "❌ Git repository not found at expected location"
    exit 1
fi

HOOKS_DIR="$GIT_DIR/hooks"

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Check if we're committing files in the cs2d directory
if git diff --cached --name-only | grep -q "^examples/cs2d/"; then
    echo "🎮 CS2D files detected, running validation..."
    
    # Save current directory
    ORIGINAL_DIR=$(pwd)
    
    # Change to cs2d directory
    cd examples/cs2d
    
    # Run pre-commit checks
    if [ -f scripts/pre-commit.sh ]; then
        ./scripts/pre-commit.sh
        RESULT=$?
    else
        echo "⚠️  Pre-commit script not found"
        RESULT=0
    fi
    
    # Return to original directory
    cd "$ORIGINAL_DIR"
    
    exit $RESULT
fi
EOF

chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Git hooks installed successfully!"
echo "📝 Pre-commit hook will run when committing CS2D files"