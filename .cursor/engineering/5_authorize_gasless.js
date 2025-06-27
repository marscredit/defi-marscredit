const PaymasterEnabledGrant = artifacts.require("PaymasterEnabledGrant");
const MarsGrantPaymaster = artifacts.require("MarsGrantPaymaster");

module.exports = async function(deployer, network, accounts) {
  console.log("🔗 Authorizing Gasless Transaction System...\n");
  console.log("Network:", network);
  console.log("Account:", accounts[0]);

  try {
    // Contract addresses
    const GRANT_ADDRESS = '0x262622B66cB6fB6b1AAb0F22Dcf57b84c66f27B6';
    const PAYMASTER_ADDRESS = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4';

    console.log("Grant Contract:", GRANT_ADDRESS);
    console.log("Paymaster Contract:", PAYMASTER_ADDRESS);
    console.log("");

    // Get contract instances
    const grantContract = await PaymasterEnabledGrant.at(GRANT_ADDRESS);
    const paymasterContract = await MarsGrantPaymaster.at(PAYMASTER_ADDRESS);

    // Step 1: Authorize paymaster on grant contract
    console.log("🚀 Step 1: Authorizing paymaster on grant contract...");
    const tx1 = await grantContract.authorizePaymaster(PAYMASTER_ADDRESS, true, {
      from: accounts[0],
      gas: 100000,
      gasPrice: '100000000' // 0.1 gwei
    });
    console.log("✅ Grant → Paymaster authorization successful!");
    console.log("📝 Transaction:", tx1.tx);
    console.log("");

    // Step 2: Authorize grant contract on paymaster
    console.log("🚀 Step 2: Authorizing grant contract on paymaster...");
    const tx2 = await paymasterContract.authorizeContract(GRANT_ADDRESS, true, {
      from: accounts[0],
      gas: 100000,
      gasPrice: '100000000' // 0.1 gwei
    });
    console.log("✅ Paymaster → Grant authorization successful!");
    console.log("📝 Transaction:", tx2.tx);
    console.log("");

    console.log("🎉 GASLESS SYSTEM ACTIVATED! 🎉");
    console.log("");
    console.log("✅ Users can now redeem tokens with ZERO gas fees!");
    console.log("⚡ Visit your frontend to test gasless redemptions");
    console.log("🎯 Rate limit: 1 gasless transaction per user every 1000 blocks (~4 hours)");
    console.log("");
    console.log("🌐 Test URL: http://localhost:3000/grants/0x262622B66cB6fB6b1AAb0F22Dcf57b84c66f27B6");

  } catch (error) {
    console.error("❌ Authorization failed:", error.message);
    throw error;
  }
}; 