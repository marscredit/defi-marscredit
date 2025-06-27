const SimpleTokenGrant = artifacts.require("SimpleTokenGrant");

module.exports = function (deployer, network, accounts) {
  // Set the redemption amount per user (in wei)
  // 5000 MARS = 5000 * 10^18 wei (standard ERC20 decimals) - large grant for early adopters
  const redemptionAmountPerUser = web3.utils.toWei("5000", "ether"); // 5000 MARS per user
  
  console.log("Deploying SimpleTokenGrant contract...");
  console.log("Network:", network);
  console.log("Deployer account:", accounts[0]);
  console.log("Redemption amount per user:", redemptionAmountPerUser, "wei (5000 MARS)");
  
  deployer.deploy(SimpleTokenGrant, redemptionAmountPerUser).then(function(instance) {
    console.log("SimpleTokenGrant deployed at address:", instance.address);
    console.log("Remember to fund the contract with MARS tokens using the fundGrant() function");
    
    // Save deployment info for frontend
    const fs = require('fs');
    const deploymentInfo = {
      address: instance.address,
      network: network,
      chainId: network === 'marscredit' ? 110110 : (network === 'marscredit_testnet' ? 110110 : 'development'),
      deployedAt: new Date().toISOString(),
      redemptionAmountPerUser: redemptionAmountPerUser
    };
    
    // Create deployment info file for frontend
    const deploymentPath = './src/contracts/deployment.json';
    fs.mkdirSync('./src/contracts', { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("Deployment info saved to:", deploymentPath);
  });
}; 