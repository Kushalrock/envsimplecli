# Contributing to EnvSimple CLI

Thank you for your interest in contributing to EnvSimple CLI!

## License

EnvSimple CLI is licensed under the **Apache License 2.0**.

By contributing to this project, you agree that your contributions will be licensed under the same Apache 2.0 License.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/envsimple/cli.git
cd cli

# Install dependencies
bun install

# Build the project
bun run build

# Run in development mode
bun run dev <command>
```

## Development Workflow

### Making Changes

1. **Fork** the repository
2. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** with clear, focused commits
4. **Test** your changes thoroughly
5. **Push** to your fork
6. **Open a Pull Request** with a clear description

### Commit Messages

Write clear, concise commit messages:

```
Add support for environment templates

- Implement template loading from .envsimple.template
- Add CLI command for template management
- Update documentation
```

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Keep functions focused and testable
- Add comments for complex logic
- Use meaningful variable names

### Testing

Before submitting:

```bash
# Build the project
bun run build

# Test core commands
bun run dev login
bun run dev status
bun run dev pull
bun run dev push
```

### Ideas for Contribution

- **Bug fixes**: Found a bug? Fix it!
- **Documentation**: Improve README, add examples, clarify usage
- **Features**: Propose new commands or functionality
- **Performance**: Optimize slow operations
- **Error handling**: Improve error messages and recovery
- **Tests**: Add test coverage
- **Examples**: Add example workflows or use cases

## Pull Request Process

1. **Update documentation** if you're changing behavior
2. **Keep PRs focused** - one feature or fix per PR
3. **Describe changes** clearly in the PR description
4. **Link related issues** using keywords like "Fixes #123"
5. **Respond to feedback** promptly

### PR Review Checklist

- [ ] Code builds successfully
- [ ] Changes are tested manually
- [ ] Documentation is updated if needed
- [ ] Commit messages are clear
- [ ] No unnecessary dependencies added
- [ ] Code follows existing patterns

## Reporting Issues

### Bug Reports

Include:

- EnvSimple CLI version (`envsimple --version`)
- Operating system and version
- Steps to reproduce
- Expected vs actual behavior
- Error messages or logs

### Feature Requests

Describe:

- The problem you're trying to solve
- Your proposed solution
- Alternative solutions considered
- Why this would benefit other users

## Code of Conduct

### Our Standards

- Be respectful and professional
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions

### Unacceptable Behavior

- Harassment or discriminatory language
- Personal attacks
- Trolling or inflammatory comments
- Publishing others' private information

## Questions?

- **Documentation**: Check the [README](README.md)
- **Issues**: Search existing issues before opening new ones
- **Discussions**: Use GitHub Discussions for questions

## Recognition

Contributors are recognized in:

- Git commit history
- GitHub contributors page
- Release notes for significant contributions

Thank you for helping make EnvSimple better!
