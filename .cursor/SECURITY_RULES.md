# Mars Bridge Security Rules

## 🔒 Security Scanning Rules

### Automatic Security Scans

1. **Pre-Commit Hook**: Security scan runs automatically before every git commit
2. **Manual Scan**: Run `npm run security-scan` anytime to check for issues
3. **CI/CD Integration**: Add `npm run security-scan` to your CI/CD pipeline

### What Gets Scanned

The security scanner checks for:

- **Ethereum Private Keys** (64-character hex strings)
- **Solana Private Keys** (64-element number arrays)  
- **AWS Access Keys** (AKIA format)
- **Base64 Private Keys** (PEM format)
- **Hardcoded API Keys and Secrets**
- **JWT Tokens**
- **Generic Password/Secret Patterns**

### Security Requirements

✅ **REQUIRED**: All sensitive data MUST use environment variables
✅ **REQUIRED**: No hardcoded private keys in any file  
✅ **REQUIRED**: Security scan must pass before commits
✅ **REQUIRED**: Add sensitive files to .gitignore

❌ **FORBIDDEN**: Hardcoded private keys in code
❌ **FORBIDDEN**: Committing sensitive configuration files
❌ **FORBIDDEN**: Bypassing security scans

### Environment Variables Only

All sensitive data must be stored as environment variables:

```javascript
// ✅ CORRECT: Use environment variables
const privateKey = process.env.PRIVATE_KEY;
const apiKey = process.env.API_KEY;

// ❌ WRONG: Hardcoded secrets
const privateKey = "0x1234567890abcdef...";
const apiKey = "sk_live_1234567890...";
```

### File Exclusions

Files automatically excluded from scanning:
- All files in .gitignore
- Binary files (images, archives, etc.)
- Node modules
- Build/dist directories
- Log files

### Emergency Procedures

If sensitive data is accidentally committed:

1. **STOP** - Do not push to remote repository
2. Run the security migration process:
   - Generate new keys
   - Deploy new infrastructure  
   - Migrate assets
   - Update environment variables
3. Consider the compromised keys as permanently exposed

### Compliance

- Security scans are **mandatory** for all commits
- Failed security scans **block** commits automatically
- Manual bypassing of security checks is **prohibited**
- All team members must follow these rules

### Testing

Run security scan manually:
```bash
npm run security-scan
```

Check specific files:
```bash
node scripts/security-scan.js
```

## 🚨 Incident Response

If security issues are found:

1. **Fix immediately** - Remove all hardcoded secrets
2. **Use environment variables** - Replace with proper configuration
3. **Re-scan** - Verify fixes with `npm run security-scan`
4. **Document** - Record what was fixed and how

Remember: Security is everyone's responsibility!
