#!/bin/bash

# Pre-commit validation script for CS2D
# Run this before committing to ensure code quality

set -e

echo "🔍 Running pre-commit checks..."

# Change to project directory
cd "$(dirname "$0")/.."

# Type checking
echo "📝 Type checking..."
pnpm run typecheck

# ESLint
echo "🔍 Running ESLint..."
pnpm run lint:check

# Prettier (TypeScript files only)
echo "💅 Checking formatting..."
pnpm exec prettier --check "src/**/*.{ts,tsx}" "tests/**/*.{ts,tsx}" "*.{json,md}" "*.config.ts"

# Tests
echo "🧪 Running tests..."
pnpm run test --run

echo "✅ All pre-commit checks passed!"