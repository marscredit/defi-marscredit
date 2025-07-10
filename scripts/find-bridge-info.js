#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Finding Bridge Program Information');
console.log('====================================');

// Check Anchor.toml for program ID
try {
  const anchorToml = fs.readFileSync(path.join(__dirname, '..', 'Anchor.toml'), 'utf8');
  const lines = anchorToml.split('\n');
  
  for (const line of lines) {
    if (line.includes('mars-bridge') || line.includes('mars_bridge')) {
      console.log('📋 Found in Anchor.toml:', line.trim());
    }
  }
} catch (error) {
  console.log('⚠️  Could not read Anchor.toml:', error.message);
}

// Check target/deploy for program keypair
try {
  const deployDir = path.join(__dirname, '..', 'target', 'deploy');
  const files = fs.readdirSync(deployDir);
  
  console.log('\n🗂️  Files in target/deploy:');
  files.forEach(file => {
    if (file.includes('mars') || file.includes('bridge')) {
      console.log('   📄', file);
    }
  });
} catch (error) {
  console.log('⚠️  Could not read target/deploy:', error.message);
}

// Check programs directory
try {
  const programsDir = path.join(__dirname, '..', 'programs');
  const programs = fs.readdirSync(programsDir);
  
  console.log('\n🧩 Programs found:');
  programs.forEach(program => {
    console.log('   📦', program);
  });
} catch (error) {
  console.log('⚠️  Could not read programs directory:', error.message);
}

console.log('\n💡 Next steps:');
console.log('1. Find your bridge program ID from the above information');
console.log('2. The bridge state address is a PDA derived from your authority key');
console.log('3. Add both to your .env file as BRIDGE_PROGRAM_ID and BRIDGE_STATE_ADDRESS');
console.log('4. Restart your relayer');

console.log('\n🔧 If you need to calculate the bridge state PDA:');
console.log('   Use: PublicKey.findProgramAddress([b"bridge_state", authority.publicKey.toBuffer()], programId)'); 