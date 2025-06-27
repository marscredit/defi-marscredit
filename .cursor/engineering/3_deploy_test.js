const TestContract = artifacts.require("TestContract");

module.exports = function (deployer, network, accounts) {
  console.log("Deploying TestContract...");
  console.log("Network:", network);
  console.log("Deployer account:", accounts[0]);
  
  // Simple test value
  const testValue = 42;
  console.log("Test value:", testValue);
  
  deployer.deploy(TestContract, testValue).then(function(instance) {
    console.log("TestContract deployed at address:", instance.address);
    console.log("Deployment successful - Mars Credit Network is working!");
  });
}; 