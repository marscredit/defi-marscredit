const PaymasterEnabledGrant = artifacts.require("PaymasterEnabledGrant");

module.exports = function(deployer, network, accounts) {
  console.log("Deploying PaymasterEnabledGrant to network:", network);
  console.log("Deployer account:", accounts[0]);
  
  // Deploy with 5000 MARS reward per user (5000 * 10^18 wei)
  const redemptionAmountPerUser = web3.utils.toWei('5000', 'ether');
  
  deployer.deploy(PaymasterEnabledGrant, redemptionAmountPerUser, {
    from: accounts[0],
    gas: 2500000,
    gasPrice: '100000000' // 0.1 gwei
  }).then((instance) => {
    console.log("PaymasterEnabledGrant deployed at:", instance.address);
    console.log("Redemption amount per user:", web3.utils.fromWei(redemptionAmountPerUser, 'ether'), "MARS");
    console.log("Owner:", accounts[0]);
    
    console.log("\n=== Next Steps ===");
    console.log("1. Fund the grant contract with MARS tokens");
    console.log("2. Authorize paymaster contract to call redeemForUser");
    console.log("3. Test gasless redemption flow");
    
    return instance;
  });
}; 