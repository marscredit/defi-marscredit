// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title TestGenesisGrant
 * @dev Simple test grant contract for Mars Credit Network
 * Basic grant functionality for testing and demonstration
 */
contract TestGenesisGrant {
    // Events
    event GrantCreated(uint256 redemptionAmount);
    event GrantFunded(uint256 amount);
    event TokensRedeemed(address indexed user, uint256 amount);

    // State variables
    address public owner;
    uint256 public totalTokensAvailable;
    uint256 public redemptionAmountPerUser;
    uint256 public tokensRedeemed;
    bool public paused;

    // Mappings
    mapping(address => bool) public hasRedeemed;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "TestGenesisGrant: Not the owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "TestGenesisGrant: Contract is paused");
        _;
    }

    // Constructor
    constructor(uint256 _redemptionAmountPerUser) {
        owner = msg.sender;
        redemptionAmountPerUser = _redemptionAmountPerUser;
        paused = false;
        emit GrantCreated(_redemptionAmountPerUser);
    }

    /**
     * @dev Fund the contract with MARS tokens
     */
    function fundGrant() external payable onlyOwner {
        require(
            msg.value > 0,
            "TestGenesisGrant: Must send MARS tokens to fund"
        );
        totalTokensAvailable += msg.value;
        emit GrantFunded(msg.value);
    }

    /**
     * @dev Redeem MARS tokens for the caller
     * Each address can only redeem once
     */
    function redeemTokens() external whenNotPaused {
        require(
            !hasRedeemed[msg.sender],
            "TestGenesisGrant: Address has already redeemed"
        );
        require(
            redemptionAmountPerUser > 0,
            "TestGenesisGrant: Redemption amount not set"
        );

        // Add gas allowance for user operations
        uint256 gasAllowance = 0.01 ether;
        uint256 totalRedemption = redemptionAmountPerUser + gasAllowance;

        require(
            tokensRedeemed + totalRedemption <= totalTokensAvailable,
            "TestGenesisGrant: Insufficient tokens remaining"
        );

        // Mark as redeemed first to prevent reentrancy
        hasRedeemed[msg.sender] = true;
        tokensRedeemed += totalRedemption;

        // Transfer MARS tokens + gas allowance to user
        (bool success, ) = payable(msg.sender).call{value: totalRedemption}("");
        require(success, "TestGenesisGrant: Failed to transfer MARS tokens");

        emit TokensRedeemed(msg.sender, totalRedemption);
    }

    /**
     * @dev Get remaining tokens available for redemption
     */
    function getRemainingTokens() external view returns (uint256) {
        return totalTokensAvailable - tokensRedeemed;
    }

    /**
     * @dev Get number of users who can still redeem
     */
    function getRemainingRedemptions() external view returns (uint256) {
        if (redemptionAmountPerUser == 0) return 0;

        uint256 gasAllowance = 0.01 ether;
        uint256 totalRedemptionPerUser = redemptionAmountPerUser + gasAllowance;

        return (totalTokensAvailable - tokensRedeemed) / totalRedemptionPerUser;
    }

    /**
     * @dev Check if an address has already redeemed
     */
    function hasAddressRedeemed(address _user) external view returns (bool) {
        return hasRedeemed[_user];
    }

    /**
     * @dev Emergency withdrawal function (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "TestGenesisGrant: No funds to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "TestGenesisGrant: Failed to withdraw funds");
    }

    /**
     * @dev Pause the contract (owner only)
     */
    function pause() external onlyOwner {
        paused = true;
    }

    /**
     * @dev Unpause the contract (owner only)
     */
    function unpause() external onlyOwner {
        paused = false;
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get grant information summary
     */
    function getGrantInfo()
        external
        view
        returns (
            uint256 totalAvailable,
            uint256 redemptionAmount,
            uint256 redeemed,
            uint256 remaining,
            bool isPaused
        )
    {
        return (
            totalTokensAvailable,
            redemptionAmountPerUser,
            tokensRedeemed,
            totalTokensAvailable - tokensRedeemed,
            paused
        );
    }

    /**
     * @dev Receive function to accept direct MARS transfers
     */
    receive() external payable {
        require(
            msg.value > 0,
            "TestGenesisGrant: Must send MARS tokens to fund"
        );
        totalTokensAvailable += msg.value;
        emit GrantFunded(msg.value);
    }
}
