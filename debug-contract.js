// Debug script for checking contract status in browser console
// Copy and paste this into your browser console while on the grants page

console.log("🔍 Starting contract debug...");

const contractAddress = "0x262622B66cB6fB6b1AAb0F22Dcf57b84c66f27B6";

// Check if we're on the right page
if (!window.ethereum) {
  console.error("❌ No ethereum provider found. Please connect your wallet.");
} else {
  console.log("✅ Ethereum provider found");
}

// Simple function to check contract
async function debugContract() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Check contract code
    const code = await provider.getCode(contractAddress);
    console.log(`📝 Contract code length: ${code.length} chars`);
    
    if (code === "0x") {
      console.error("❌ No contract deployed at this address!");
      return;
    }
    
    // Check balance
    const balance = await provider.getBalance(contractAddress);
    console.log(`💰 Contract balance: ${ethers.utils.formatEther(balance)} MARS`);
    
    // Try to call functions directly
    const simpleAbi = [
      "function paused() view returns (bool)",
      "function getBalance() view returns (uint256)",
      "function owner() view returns (address)"
    ];
    
    const contract = new ethers.Contract(contractAddress, simpleAbi, provider);
    
    const [isPaused, contractBalance, owner] = await Promise.all([
      contract.paused().catch(() => "FAILED"),
      contract.getBalance().catch(() => "FAILED"), 
      contract.owner().catch(() => "FAILED")
    ]);
    
    console.log("📊 CONTRACT STATUS:");
    console.log(`⏸️ Paused: ${isPaused}`);
    console.log(`💳 Balance: ${contractBalance !== "FAILED" ? ethers.utils.formatEther(contractBalance) + " MARS" : "FAILED"}`);
    console.log(`👤 Owner: ${owner}`);
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

// Run the debug
debugContract();

console.log(`
🎯 MANUAL CHECKS:
1. Go to https://blockscan.marscredit.xyz/address/${contractAddress}
2. Check if the contract shows any transactions
3. Look for any error events in the transaction history
4. Verify the contract is actually the SimpleTokenGrant contract

💡 POSSIBLE ISSUES:
- Wrong contract type deployed
- Contract ran out of gas during deployment
- Functions don't exist (wrong ABI)
- Contract was self-destructed
`); 