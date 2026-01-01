# Contributing to SuperInstance Core

Thank you for your interest in contributing to SuperInstance Core!

## How to Contribute

### Reporting Issues

Found a bug? Have a feature request? Please open an issue on GitHub.

### Submitting Pull Requests

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

### Commit Message Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/SuperInstanceCore.git
cd SuperInstanceCore
pnpm install
pnpm dev
```

The dashboard will be available at http://localhost:3001

### Coding Standards

- Use TypeScript for all new code
- Follow existing code style
- Add JSDoc comments for exports
- Run `pnpm type-check` before committing
- Run `pnpm lint` before committing

### Project Structure

```
core-app/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/             # Utility libraries
│   └── types/           # TypeScript definitions
└── public/              # Static assets
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
