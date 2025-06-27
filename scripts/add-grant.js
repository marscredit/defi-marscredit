#!/usr/bin/env node

/**
 * Add Grant Script
 * Helper script to add new grants to the registry
 * 
 * Usage: node scripts/add-grant.js <contractAddress> <name> <description> [category]
 */

const fs = require('fs');
const path = require('path');

function addGrant(contractAddress, name, description, category = 'community') {
  const registryPath = path.join(__dirname, '../src/lib/grants-registry.ts');
  
  if (!fs.existsSync(registryPath)) {
    console.error('❌ Registry file not found:', registryPath);
    process.exit(1);
  }
  
  // Validate contract address
  if (!contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    console.error('❌ Invalid contract address format');
    process.exit(1);
  }
  
  // Generate new grant config
  const newGrant = {
    id: `grant-${Date.now()}`,
    name,
    description,
    contractAddress,
    deployedAt: new Date().toISOString(),
    category,
    isActive: true
  };
  
  console.log('🎯 New Grant Configuration:');
  console.log(JSON.stringify(newGrant, null, 2));
  console.log('');
  
  // Instructions for manual addition
  console.log('📋 To add this grant to your registry:');
  console.log('1. Open src/lib/grants-registry.ts');
  console.log('2. Add this configuration to the GRANTS_REGISTRY array:');
  console.log('');
  console.log('  {');
  console.log(`    id: '${newGrant.id}',`);
  console.log(`    name: '${newGrant.name}',`);
  console.log(`    description: '${newGrant.description}',`);
  console.log(`    contractAddress: '${newGrant.contractAddress}',`);
  console.log(`    deployedAt: '${newGrant.deployedAt}',`);
  console.log(`    category: '${newGrant.category}',`);
  console.log(`    isActive: true`);
  console.log('  }');
  console.log('');
  console.log('✅ The grant will appear in your frontend after refresh!');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Usage: node scripts/add-grant.js <contractAddress> <name> <description> [category]');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/add-grant.js 0x123...abc "My Grant" "Description" genesis');
  console.log('');
  console.log('Categories: genesis, community, developer, special');
  process.exit(1);
}

const [contractAddress, name, description, category] = args;
addGrant(contractAddress, name, description, category); 