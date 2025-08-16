# Contributing to CS2D

Thank you for your interest in contributing to CS2D! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/cs2d/issues)
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, browser, Ruby version)

### Suggesting Features

1. Check existing feature requests in [Issues](https://github.com/yourusername/cs2d/issues)
2. Create a new issue with the `enhancement` label
3. Describe the feature and its use case

### Code Contributions

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/cs2d.git
   cd cs2d
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   # Run Ruby tests
   bundle exec rspec
   
   # Run linting
   bundle exec rubocop
   
   # Test with Docker
   make test
   ```

5. **Commit Your Changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```
   
   Follow conventional commits:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes
   - `refactor:` Code refactoring
   - `test:` Test additions/changes
   - `chore:` Maintenance tasks

6. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a PR on GitHub.

## Development Setup

### Prerequisites
- Ruby 3.0+
- Docker and Docker Compose
- Redis
- Node.js (for Playwright tests)

### Local Development
```bash
# Install dependencies
bundle install

# Start with Docker
make up

# Or start manually
./start_hybrid_servers.sh
```

### Code Style

- Ruby: Follow RuboCop rules (`.rubocop.yml`)
- JavaScript: Use consistent formatting
- Indent with 2 spaces
- No trailing whitespace
- Unix line endings (LF)

### Testing

All new features should include tests:

- Ruby: RSpec tests in `spec/` directory
- JavaScript: Playwright tests in `docs/testing/`
- Integration: Full game flow tests

### Documentation

- Update README.md for user-facing changes
- Add technical documentation to `docs/`
- Comment complex code sections
- Update CHANGELOG.md

## Pull Request Process

1. Ensure all tests pass
2. Update documentation
3. Add entry to CHANGELOG.md
4. Request review from maintainers
5. Address review feedback
6. Squash commits if requested

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive criticism
- Help others learn and grow

## Questions?

Feel free to:
- Open an issue for questions
- Join discussions
- Contact maintainers

Thank you for contributing to CS2D!