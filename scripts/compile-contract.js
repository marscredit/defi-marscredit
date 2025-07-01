const fs = require('fs');
const path = require('path');
const solc = require('solc');

// Paths
const contractsDir = path.join(__dirname, '..', 'contracts');
const buildDir = path.join(__dirname, '..', 'build', 'contracts');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

function compileContract(contractName) {
  console.log(`🔨 Compiling ${contractName}...`);
  
  const contractPath = path.join(contractsDir, `${contractName}.sol`);
  
  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract file not found: ${contractPath}`);
  }
  
  const source = fs.readFileSync(contractPath, 'utf8');
  
  // Compilation input
  const input = {
    language: 'Solidity',
    sources: {
      [`${contractName}.sol`]: {
        content: source
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      },
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  };
  
  console.log('⚙️ Running Solidity compiler...');
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    const hasErrors = output.errors.some(error => error.severity === 'error');
    
    if (hasErrors) {
      console.error('❌ Compilation errors:');
      output.errors.forEach(error => {
        if (error.severity === 'error') {
          console.error(`  - ${error.formattedMessage}`);
        }
      });
      throw new Error('Compilation failed');
    } else {
      console.warn('⚠️ Compilation warnings:');
      output.errors.forEach(error => {
        if (error.severity === 'warning') {
          console.warn(`  - ${error.formattedMessage}`);
        }
      });
    }
  }
  
  // Extract compiled contract
  const contract = output.contracts[`${contractName}.sol`][contractName];
  
  if (!contract) {
    throw new Error(`Contract ${contractName} not found in compilation output`);
  }
  
  const compiledContract = {
    contractName: contractName,
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
    deployedBytecode: contract.evm.deployedBytecode.object,
    metadata: contract.metadata,
    devdoc: contract.devdoc,
    userdoc: contract.userdoc,
    compilationDetails: {
      compiler: {
        version: solc.version()
      },
      compiledAt: new Date().toISOString()
    }
  };
  
  // Save compiled contract
  const outputPath = path.join(buildDir, `${contractName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(compiledContract, null, 2));
  
  console.log(`✅ ${contractName} compiled successfully!`);
  console.log(`📁 Output saved to: ${outputPath}`);
  console.log(`📊 Contract size: ${Math.round(contract.evm.bytecode.object.length / 2)} bytes`);
  
  return compiledContract;
}

// Compile all contracts if run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const contractName = args[0] || 'EnhancedTokenGrant';
  
  try {
    console.log('🚀 Starting contract compilation...');
    console.log(`📋 Contract: ${contractName}`);
    console.log(`📂 Source directory: ${contractsDir}`);
    console.log(`📂 Build directory: ${buildDir}`);
    console.log('');
    
    const result = compileContract(contractName);
    
    console.log('');
    console.log('🎉 Compilation completed successfully!');
    console.log('');
    console.log('📋 Contract Summary:');
    console.log(`   Name: ${result.contractName}`);
    console.log(`   Functions: ${result.abi.filter(item => item.type === 'function').length}`);
    console.log(`   Events: ${result.abi.filter(item => item.type === 'event').length}`);
    console.log(`   Compiler: ${result.compilationDetails.compiler.version}`);
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Run deployment script: node scripts/deploy-enhanced-grant.js');
    console.log('2. Add contract address to grants registry');
    console.log('3. Use management script to configure whitelist');
    
  } catch (error) {
    console.error('💥 Compilation failed:', error.message);
    process.exit(1);
  }
}

module.exports = { compileContract }; 