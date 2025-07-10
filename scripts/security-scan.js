#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔍 Mars Bridge Security Scanner');
console.log('==============================');
console.log('');

// Security patterns to check for
const SECURITY_PATTERNS = [
  {
    name: 'Ethereum Private Key (64 char hex)',
    pattern: /[0-9a-fA-F]{64}/g,
    severity: 'CRITICAL',
    description: 'Potential Ethereum private key found'
  },
  {
    name: 'Ethereum Private Key with 0x prefix',
    pattern: /0x[0-9a-fA-F]{64}/g,
    severity: 'CRITICAL',
    description: 'Ethereum private key with 0x prefix found'
  },
  {
    name: 'Solana Private Key Array (64 numbers)',
    pattern: /\[\s*\d+\s*,\s*\d+\s*,\s*\d+.*?\]/g,
    severity: 'CRITICAL',
    description: 'Potential Solana private key array found'
  },
  {
    name: 'Generic Secret Pattern',
    pattern: /(?:key|secret|password|token)\s*[=:]\s*['""`][^'""`\s]+['""`]/gi,
    severity: 'MEDIUM',
    description: 'Generic secret pattern found'
  }
];

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /\.cursor/,
  /build/,
  /dist/,
  /coverage/,
  /\.(log|tmp|cache)$/,
  /\.json$/, // Skip JSON files to avoid false positives
  /\.env$/, // Skip .env files - these are expected to have private keys and should be gitignored
  /\.env\./  // Skip .env.* files
];

// Scan a single file
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    for (const pattern of SECURITY_PATTERNS) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          // Skip obvious false positives
          if (match.includes('example') || 
              match.includes('placeholder') || 
              match.includes('YOUR_KEY_HERE') ||
              match.includes('TO_BE_REPLACED') ||
              /^0+$/.test(match.replace(/0x/, '')) || // All zeros
              /^0x0+$/.test(match) || // 0x followed by all zeros
              match.includes('${') || // Template literals
              match.includes('process.env') || // Environment variable references
              match.includes('userAddress.toLowerCase()') // API key generation pattern
             ) {
            continue;
          }
          
          // Find line number
          const lines = content.split('\n');
          let lineNumber = 1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(match)) {
              lineNumber = i + 1;
              break;
            }
          }
          
          issues.push({
            file: filePath,
            line: lineNumber,
            severity: pattern.severity,
            name: pattern.name,
            match: match.substring(0, 50) + (match.length > 50 ? '...' : ''),
            description: pattern.description
          });
        }
      }
    }
    
    return issues;
  } catch (error) {
    console.log(`⚠️  Could not scan ${filePath}: ${error.message}`);
    return [];
  }
}

// Recursively scan directory
function scanDirectory(dir) {
  const issues = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip excluded directories
      if (EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))) {
        continue;
      }
      issues.push(...scanDirectory(filePath));
    } else if (stat.isFile()) {
      // Skip excluded files
      if (EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))) {
        continue;
      }
      
      // Only scan text files
      if (file.match(/\.(js|ts|tsx|jsx|json|md|txt|env|yml|yaml|config)$/)) {
        issues.push(...scanFile(filePath));
      }
    }
  }
  
  return issues;
}

// Main scan function
function runSecurityScan() {
  console.log('🔍 Starting security scan...');
  console.log('');
  
  const issues = scanDirectory('.');
  
  if (issues.length === 0) {
    console.log('✅ NO SECURITY ISSUES FOUND!');
    console.log('==========================');
    console.log('');
    console.log('🎉 All security checks passed!');
    console.log('   - No hardcoded private keys found');
    console.log('   - No suspicious secret patterns detected');
    console.log('   - Repository is safe to commit');
    console.log('');
    return true;
  } else {
    console.log('🚨 SECURITY ISSUES FOUND!');
    console.log('========================');
    console.log('');
    
    const criticalIssues = issues.filter(issue => issue.severity === 'CRITICAL');
    const mediumIssues = issues.filter(issue => issue.severity === 'MEDIUM');
    
    for (const issue of issues) {
      const emoji = issue.severity === 'CRITICAL' ? '🔴' : '🟡';
      console.log(`${emoji} ${issue.severity}: ${issue.name}`);
      console.log(`   File: ${issue.file}`);
      console.log(`   Line: ${issue.line}`);
      console.log(`   Match: ${issue.match}`);
      console.log('');
    }
    
    console.log('📊 SUMMARY:');
    console.log(`   🔴 Critical: ${criticalIssues.length}`);
    console.log(`   🟡 Medium: ${mediumIssues.length}`);
    console.log(`   📁 Total Files Affected: ${new Set(issues.map(i => i.file)).size}`);
    console.log('');
    
    if (criticalIssues.length > 0) {
      console.log('❌ COMMIT BLOCKED: Critical security issues found!');
      console.log('   Fix all critical issues before committing');
      return false;
    } else {
      console.log('⚠️  WARNING: Medium security issues found');
      console.log('   Review these issues before committing');
      return true;
    }
  }
}

// Run the scan
const scanPassed = runSecurityScan();
process.exit(scanPassed ? 0 : 1); 