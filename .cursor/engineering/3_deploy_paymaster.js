const MarsGrantPaymaster = artifacts.require("MarsGrantPaymaster");

module.exports = function(deployer, network, accounts) {
  console.log("Deploying to network:", network);
  console.log("Deployer account:", accounts[0]);
  
  // Deploy with 1000 block rate limit (~4 hours on Mars Credit Network)
  const rateLimitBlocks = 1000;
  
  deployer.deploy(MarsGrantPaymaster, rateLimitBlocks, {
    from: accounts[0],
    gas: 2000000,
    gasPrice: '100000000' // 0.1 gwei
  }).then((instance) => {
    console.log("MarsGrantPaymaster deployed at:", instance.address);
    console.log("Rate limit set to:", rateLimitBlocks, "blocks");
    console.log("Owner:", accounts[0]);
    
    console.log("\n=== Next Steps ===");
    console.log("1. Fund the paymaster with MARS tokens");
    console.log("2. Authorize grant contracts to use paymaster");
    console.log("3. Update frontend to use gasless transactions");
    
    return instance;
  });
}; 