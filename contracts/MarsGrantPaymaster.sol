// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title MarsGrantPaymaster
 * @dev Paymaster contract that sponsors gas fees for MARS token grant redemptions
 * Prevents users from needing MARS to redeem MARS tokens (solves chicken-and-egg problem)
 */
contract MarsGrantPaymaster {
    // Events
    event GasSponsored(
        address indexed user,
        address indexed grantContract,
        uint256 gasUsed,
        uint256 gasPaid
    );
    event PaymasterFunded(uint256 amount);
    event RateLimitUpdated(uint256 newBlockLimit);
    event GrantContractAuthorized(
        address indexed grantContract,
        bool authorized
    );

    // State variables
    address public owner;
    uint256 public rateLimitBlocks; // Blocks user must wait between sponsored transactions
    uint256 public totalGasSponsored; // Total MARS spent on gas

    // Authorized grant contracts that can use paymaster
    mapping(address => bool) public authorizedContracts;

    // Rate limiting: user address => last sponsored block number
    mapping(address => uint256) public lastSponsoredBlock;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "MarsGrantPaymaster: Not the owner");
        _;
    }

    modifier rateLimitCheck(address user) {
        require(
            lastSponsoredBlock[user] == 0 ||
                block.number >= lastSponsoredBlock[user] + rateLimitBlocks,
            "MarsGrantPaymaster: Rate limit exceeded"
        );
        _;
    }

    // Constructor
    constructor(uint256 _rateLimitBlocks) {
        owner = msg.sender;
        rateLimitBlocks = _rateLimitBlocks; // Default: 1000 blocks (~4 hours on Mars Credit Network)
    }

    /**
     * @dev Fund the paymaster with MARS tokens for gas sponsorship
     */
    function fundPaymaster() external payable onlyOwner {
        require(msg.value > 0, "MarsGrantPaymaster: Must send MARS tokens");
        emit PaymasterFunded(msg.value);
    }

    /**
     * @dev Authorize a grant contract to use paymaster services
     */
    function authorizeContract(
        address grantContract,
        bool authorized
    ) external onlyOwner {
        authorizedContracts[grantContract] = authorized;
        emit GrantContractAuthorized(grantContract, authorized);
    }

    /**
     * @dev Sponsored redemption - user calls this instead of direct grant contract
     * Paymaster pays gas fees, then calls grant contract on user's behalf
     */
    function sponsoredRedemption(
        address grantContract
    ) external rateLimitCheck(msg.sender) {
        require(
            authorizedContracts[grantContract],
            "MarsGrantPaymaster: Contract not authorized"
        );

        uint256 gasStart = gasleft();

        // Update rate limit tracking
        lastSponsoredBlock[msg.sender] = block.number;

        // Call the grant contract's redeemForUser function on behalf of user
        // This allows the paymaster to sponsor the gas while user receives tokens
        (bool success, bytes memory data) = grantContract.call(
            abi.encodeWithSignature("redeemForUser(address)", msg.sender)
        );

        require(success, "MarsGrantPaymaster: Grant redemption failed");

        // Calculate gas used and track it
        uint256 gasUsed = gasStart - gasleft();
        uint256 gasCost = gasUsed * tx.gasprice;
        totalGasSponsored += gasCost;

        emit GasSponsored(msg.sender, grantContract, gasUsed, gasCost);
    }

    /**
     * @dev Check if user can use sponsored transaction (rate limit check)
     */
    function canUseSponsoredTransaction(
        address user
    ) external view returns (bool) {
        return
            lastSponsoredBlock[user] == 0 ||
            block.number >= lastSponsoredBlock[user] + rateLimitBlocks;
    }

    /**
     * @dev Get blocks remaining until user can use sponsored transaction again
     */
    function getBlocksUntilNextSponsorship(
        address user
    ) external view returns (uint256) {
        if (lastSponsoredBlock[user] == 0) return 0;

        uint256 nextAllowedBlock = lastSponsoredBlock[user] + rateLimitBlocks;
        if (block.number >= nextAllowedBlock) return 0;

        return nextAllowedBlock - block.number;
    }

    /**
     * @dev Update rate limit (owner only)
     */
    function updateRateLimit(uint256 newBlockLimit) external onlyOwner {
        rateLimitBlocks = newBlockLimit;
        emit RateLimitUpdated(newBlockLimit);
    }

    /**
     * @dev Get paymaster balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "MarsGrantPaymaster: No funds to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "MarsGrantPaymaster: Failed to withdraw");
    }

    /**
     * @dev Get stats for monitoring
     */
    function getStats()
        external
        view
        returns (uint256 balance, uint256 totalSponsored, uint256 rateLimit)
    {
        return (address(this).balance, totalGasSponsored, rateLimitBlocks);
    }

    /**
     * @dev Receive function to accept direct MARS funding
     */
    receive() external payable {
        emit PaymasterFunded(msg.value);
    }
}
