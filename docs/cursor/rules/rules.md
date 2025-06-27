# Mars Credit Network DeFi Application - Project Rules

## Coding Standards

### TypeScript/JavaScript
- Use TypeScript for all React components and utilities
- Prefer functional components with hooks over class components
- Use `'use client'` directive for client-side components in Next.js 13 App Router
- Implement proper error handling with try-catch blocks
- Use async/await over Promises for better readability

### CSS/Styling
- Use Tailwind CSS for styling with Mars-themed design system
- Follow the color scheme: black background with bright red accents (#dc2626)
- Use CSS custom properties for Mars theme colors (defined in globals.css)
- Implement responsive design with mobile-first approach
- Use semantic class names for custom components (e.g., `mars-button`, `mars-card`)

### Smart Contracts (Solidity)
- Follow OpenZeppelin best practices for security
- Use Solidity 0.8.19 for all contracts
- Implement reentrancy guards for state-changing functions
- Include comprehensive event logging for frontend integration
- Add natspec documentation for all functions

## File Organization

### Directory Structure
```
defi-marscredit/
├── contracts/          # Smart contracts
├── docs/cursor/        # Documentation
│   ├── rules/         # Project rules and guidelines
│   └── iterations/    # Development iteration docs
├── app/               # Next.js frontend application
│   ├── src/
│   │   ├── app/      # App Router pages
│   │   ├── components/ # Reusable React components
│   │   └── lib/      # Utilities and configurations
└── migrations/        # Truffle deployment scripts
```

### Naming Conventions
- **Files**: Use kebab-case for file names (e.g., `token-grant.tsx`)
- **Components**: Use PascalCase for React components (e.g., `TokenGrantCard`)
- **Functions**: Use camelCase for functions (e.g., `formatMarsAmount`)
- **Constants**: Use SCREAMING_SNAKE_CASE (e.g., `TOKEN_GRANT_ABI`)
- **CSS Classes**: Use Mars-themed prefixes (e.g., `mars-button`, `mars-card`)

## Git Workflow

### Commit Message Format
Use descriptive commit messages following this format:
- `feat: add token grant redemption interface`
- `fix: resolve wallet connection issue on mobile`
- `docs: update installation instructions`
- `style: improve Mars theme consistency`
- `refactor: optimize contract interaction logic`
- `test: add unit tests for grant contract`

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature development
- `hotfix/*`: Emergency fixes for production

### Pull Request Guidelines
- Include clear description of changes
- Reference related issues
- Ensure all tests pass
- Maintain code coverage above 80%
- Include screenshots for UI changes

## Component Standards

### React Components
- Use TypeScript interfaces for props
- Implement proper loading and error states
- Include accessibility attributes (ARIA labels, roles)
- Follow responsive design principles
- Use semantic HTML elements

### Layout Components
- Wrap all pages with the `Layout` component
- Include the `Navigation` component for consistent header
- Implement proper meta tags for SEO
- Ensure mobile-responsive navigation

### Web3 Integration
- Use wagmi hooks for blockchain interactions
- Implement proper error handling for failed transactions
- Show loading states during blockchain operations
- Provide clear user feedback for transaction status
- Handle wallet connection states gracefully

## Testing Requirements

### Frontend Testing
- Unit tests for utility functions
- Component testing with React Testing Library
- Integration tests for Web3 functionality
- E2E tests for critical user flows
- Accessibility testing with axe-core

### Smart Contract Testing
- Unit tests for all contract functions
- Test security features (reentrancy, access control)
- Gas optimization testing
- Integration tests with frontend
- Security audits before mainnet deployment

## Security Guidelines

### Smart Contracts
- Use OpenZeppelin contracts for standard functionality
- Implement access control with proper roles
- Add reentrancy guards for state-changing functions
- Include pause functionality for emergency stops
- Conduct thorough testing before deployment

### Frontend Security
- Validate all user inputs
- Sanitize data before display
- Use HTTPS for all external requests
- Store sensitive data securely
- Implement proper CSP headers

### Environment Variables
- Never commit private keys or sensitive data
- Use environment variables for configuration
- Provide `.env.example` template
- Document all required environment variables

## Performance Guidelines

### Frontend Optimization
- Implement code splitting with Next.js
- Optimize images and static assets
- Use React.memo for expensive components
- Implement proper caching strategies
- Monitor bundle size and performance metrics

### Smart Contract Optimization
- Optimize gas usage in contract functions
- Use events for data logging instead of storage
- Implement efficient data structures
- Consider contract size limits
- Use assembly for gas-critical operations (when necessary)

## Accessibility Standards

### WCAG Compliance
- Ensure AA level WCAG compliance
- Implement proper color contrast (minimum 4.5:1)
- Provide keyboard navigation support
- Include screen reader compatibility
- Add alternative text for images

### Mars Theme Accessibility
- Ensure red accents meet contrast requirements
- Provide focus indicators for interactive elements
- Use semantic HTML for proper structure
- Test with screen readers and keyboard navigation

## Documentation Standards

### Code Documentation
- Include JSDoc comments for complex functions
- Document component props with TypeScript interfaces
- Provide usage examples in component stories
- Maintain up-to-date README files
- Document deployment procedures

### Iteration Documentation
- Create iteration docs for each development phase
- Include decisions, challenges, and solutions
- Document API changes and breaking changes
- Maintain changelog for releases
- Include screenshots and demos

## Deployment Guidelines

### Environment Setup
- Use proper environment variables for each stage
- Implement CI/CD pipelines for automated deployment
- Test on staging environment before production
- Monitor application performance and errors
- Implement proper logging and monitoring

### Smart Contract Deployment
- Deploy to testnet first for validation
- Verify contracts on block explorers
- Update frontend configuration with contract addresses
- Monitor contract interactions and gas usage
- Implement upgrade strategies if needed

## Quality Assurance

### Code Review Process
- All code must be reviewed before merging
- Review for security vulnerabilities
- Check for Mars theme consistency
- Verify accessibility compliance
- Test on multiple devices and browsers

### Continuous Integration
- Run automated tests on every commit
- Check code formatting and linting
- Build and deploy to staging environment
- Monitor test coverage and performance
- Alert on security vulnerabilities

---

## Contact

For questions about these rules or suggestions for improvements:
- Create an issue in the GitHub repository
- Contact the development team
- Join our community Discord for discussions

Last updated: January 2024 