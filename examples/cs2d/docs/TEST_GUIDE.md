# 🧪 CS2D Testing Guide

This guide provides comprehensive instructions for running, writing, and maintaining tests for the CS2D project.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Test Types](#test-types)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [CI/CD Integration](#cicd-integration)
6. [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
make test-deps

# Start services
make up
```

### Run All Tests

```bash
# Comprehensive test suite
make test

# Quick smoke test
make smoke-test
```

## 🔬 Test Types

### 1. Ruby Unit Tests (`spec/lib/`)

Test individual Ruby classes and modules in isolation.

**Location**: `spec/lib/`  
**Framework**: RSpec  
**Purpose**: Test business logic, utility functions, and core components

```bash
# Run unit tests only
make test-unit

# Run specific test file
cd config && bundle exec rspec ../spec/lib/render_manager_spec.rb
```

### 2. Integration Tests (`spec/integration/`)

Test component interactions and system integration.

**Location**: `spec/integration/`  
**Framework**: RSpec  
**Purpose**: Test WebSocket connections, Redis operations, Docker health

```bash
# Run all integration tests
make test-integration

# Run specific integration tests
make test-redis
make test-websocket
make test-docker
```

### 3. End-to-End Tests (`tests/e2e/`)

Test complete user workflows in real browsers.

**Location**: `tests/e2e/`  
**Framework**: Playwright  
**Purpose**: Test lobby functionality, game mechanics, UI interactions

```bash
# Run Playwright tests
make playwright

# Run with UI
make playwright-ui

# Debug mode
make playwright-debug
```

## 🎯 Running Tests

### Development Testing

```bash
# Quick development loop
make quick-test

# Watch for changes
make test-watch

# Specific test categories
make test-ruby
make test-playwright
make test-integration
```

### Full Test Suite

```bash
# Complete test suite (CI equivalent)
make test-ci

# With coverage report
make test-coverage

# Performance testing
make test-performance
```

### Service-Specific Tests

```bash
# Redis operations
make test-redis

# WebSocket connections
make test-websocket

# Docker container health
make test-docker

# Room management
make test-room-management
```

## ✍️ Writing Tests

### Ruby Tests (RSpec)

```ruby
# spec/lib/my_class_spec.rb
require 'spec_helper'

RSpec.describe MyClass do
  describe '#my_method' do
    it 'does something expected' do
      instance = MyClass.new
      result = instance.my_method
      expect(result).to eq 'expected_value'
    end
  end
end
```

### Integration Tests

```ruby
# spec/integration/my_integration_spec.rb
require 'spec_helper'

RSpec.describe 'My Integration', type: :integration do
  before do
    clear_redis
  end

  it 'integrates components correctly' do
    # Test component interaction
    create_test_room(id: 'test-room')
    expect(redis_exists?('room:test-room')).to be true
  end
end
```

### Playwright Tests

```javascript
// tests/e2e/my-feature.spec.js
const { test, expect } = require('@playwright/test');

test('feature works correctly', async ({ page }) => {
  await page.goto('/');
  await page.click('#my-button');
  await expect(page.locator('#result')).toContainText('Success');
});
```

### Test Factories

Use FactoryBot for consistent test data:

```ruby
# spec/factories/rooms.rb
FactoryBot.define do
  factory :room do
    sequence(:id) { |n| "room-#{n}" }
    name { 'Test Room' }
    max_players { 10 }
    player_count { 0 }

    trait :active do
      status { 'active' }
      player_count { 5 }
    end
  end
end

# Usage in tests
room = build(:room, :active, name: 'Special Room')
```

## 🔧 Test Configuration

### RSpec Configuration

**File**: `spec/spec_helper.rb`

- SimpleCov for coverage
- FactoryBot for test data
- WebMock for HTTP stubbing
- Redis helpers for integration tests

### Playwright Configuration

**File**: `playwright.config.js`

- Multi-browser testing (Chrome, Firefox, Safari)
- Screenshot on failure
- Video recording
- Mobile device testing

### GitHub Actions

**File**: `.github/workflows/test.yml`

- Automated testing on push/PR
- Parallel test execution
- Artifact collection
- Deployment integration

## 📊 Coverage and Reporting

### Generate Coverage Report

```bash
# Generate coverage
make test-coverage

# View HTML report
open coverage/index.html
```

### Test Results

```bash
# Generate comprehensive report
make test-report

# View results
cat test-results/README.md
```

### Performance Metrics

```bash
# Run performance tests
make test-performance

# View results
cat test-results/performance.txt
```

## 🛠️ Testing Tools

### Available Helpers

#### Redis Helpers (`spec/support/redis_helpers.rb`)

```ruby
# Test data creation
create_test_room(id: 'room-1', name: 'Test Room')
create_test_player(id: 'player-1', nickname: 'TestPlayer')

# Redis operations
redis_set('key', 'value')
redis_get('key')
redis_exists?('key')

# Room management
add_player_to_room('room-1', 'player-1')
```

#### Render Helpers (`spec/support/render_helpers.rb`)

```ruby
# Mock DOM elements
element = mock_dom_element('test-element')
canvas = mock_canvas(800, 600)

# Test render operations
expect_render_operations(context, [
  { type: 'clearRect', x: 0, y: 0, width: 800, height: 600 },
  { type: 'fillRect', x: 100, y: 100, width: 50, height: 50 }
])
```

### Debugging Tests

#### Ruby Tests

```bash
# Debug with pry
binding.pry

# Run with debug output
VERBOSE=true make test-ruby

# Single test with full output
cd config && bundle exec rspec ../spec/lib/my_spec.rb -fd
```

#### Playwright Tests

```bash
# Debug mode (opens browser)
make playwright-debug

# Headed mode (visible browser)
make playwright-headed

# Generate test
npx playwright codegen
```

## 🚀 CI/CD Integration

### GitHub Actions Workflow

The testing workflow runs on:

- Push to main/develop branches
- Pull requests
- Manual dispatch

### Workflow Steps

1. **Ruby Tests**: Unit and integration tests
2. **Docker Tests**: Container health and integration
3. **Playwright Tests**: End-to-end browser testing
4. **Security Scan**: Vulnerability scanning
5. **Performance Tests**: Load testing (main branch only)
6. **Deploy**: Staging and production deployment

### Environment Variables

```bash
# Required for CI
REDIS_URL=redis://localhost:6379/1
RACK_ENV=test
CI=true
```

## 🐛 Troubleshooting

### Common Issues

#### Redis Connection Issues

```bash
# Check Redis is running
docker-compose -f docker/docker-compose.yml ps redis

# Test Redis connection
redis-cli -h localhost -p 6379 ping

# Clear Redis test database
redis-cli -h localhost -p 6379 -n 1 flushdb
```

#### Services Not Starting

```bash
# Check all services
make health

# View service logs
make logs

# Restart services
make restart
```

#### Playwright Issues

```bash
# Reinstall browsers
npx playwright install --with-deps

# Check service availability
curl http://localhost:9292
curl http://localhost:9293/game.html
curl http://localhost:9294/api/maps
```

#### Test Failures

```bash
# Clean environment
make test-clean
make clean

# Rebuild and retry
make build
make test-setup
make test
```

### Performance Issues

#### Slow Tests

```bash
# Run only fast tests
make quick-test

# Profile test performance
cd config && bundle exec rspec ../spec --profile

# Parallel testing
cd config && bundle exec parallel_rspec ../spec
```

#### Memory Issues

```bash
# Monitor container resources
docker stats

# Check memory usage
make stats

# Restart with fresh containers
make clean && make up
```

### Debug Logging

#### Enable Debug Logging

```bash
# Ruby debug logs
DEBUG=true make test-ruby

# Playwright debug
DEBUG=pw:api make playwright

# Docker debug
DOCKER_BUILDKIT_PROGRESS=plain make build
```

## 📈 Best Practices

### Test Organization

1. **Unit tests**: Test single classes/modules
2. **Integration tests**: Test component interaction
3. **E2E tests**: Test complete user workflows
4. **Performance tests**: Test under load

### Test Data

1. Use factories for consistent test data
2. Clear state between tests
3. Use meaningful test data
4. Avoid hard-coded values

### Test Reliability

1. Use proper waits in Playwright tests
2. Handle async operations correctly
3. Mock external dependencies
4. Test error conditions

### Maintenance

1. Keep tests fast and focused
2. Remove redundant tests
3. Update tests with code changes
4. Monitor test coverage

## 🔄 Continuous Improvement

### Metrics to Monitor

- Test coverage percentage
- Test execution time
- Test failure rate
- Code quality metrics

### Regular Tasks

- Review and update test factories
- Optimize slow tests
- Add tests for new features
- Remove obsolete tests

### Tools Integration

- Code coverage reports
- Performance monitoring
- Security scanning
- Quality gates

---

## 📞 Support

For testing issues or questions:

1. Check this guide
2. Review test logs in `test-results/`
3. Check GitHub Actions logs
4. Review existing test examples

**Remember**: Good tests are the foundation of a reliable application. Invest time in writing clear, comprehensive tests that help catch issues early and support confident deployments.

Happy Testing! 🧪✨
