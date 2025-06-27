// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title SimpleTokenGrant
 * @dev Simplified smart contract for managing MARS token grants
 * Users can redeem a fixed amount of MARS tokens once per address
 */
contract SimpleTokenGrant {
    // Events
    event GrantCreated(uint256 redemptionAmount);
    event GrantFunded(uint256 amount);
    event TokensRedeemed(address indexed user, uint256 amount);

    // State variables
    address public owner;
    uint256 public totalTokensAvailable;
    uint256 public redemptionAmountPerUser;
    uint256 public tokensRedeemed;
    mapping(address => bool) public hasRedeemed;
    bool public paused;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "SimpleTokenGrant: Not the owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "SimpleTokenGrant: Contract is paused");
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
     * Only owner can fund the contract
     */
    function fundGrant() external payable onlyOwner {
        require(
            msg.value > 0,
            "SimpleTokenGrant: Must send MARS tokens to fund"
        );
        totalTokensAvailable += msg.value;
        emit GrantFunded(msg.value);
    }

    /**
     * @dev Redeem MARS tokens for the caller
     * Each address can only redeem once
     * Includes extra MARS for gas fees automatically
     */
    function redeemTokens() external whenNotPaused {
        require(
            !hasRedeemed[msg.sender],
            "SimpleTokenGrant: Address has already redeemed"
        );
        require(
            redemptionAmountPerUser > 0,
            "SimpleTokenGrant: Redemption amount not set"
        );

        // Add 0.01 MARS for gas fees (covers ~10-20 transactions)
        uint256 gasAllowance = 0.01 ether;
        uint256 totalRedemption = redemptionAmountPerUser + gasAllowance;

        require(
            tokensRedeemed + totalRedemption <= totalTokensAvailable,
            "SimpleTokenGrant: Insufficient tokens remaining"
        );

        // Mark as redeemed first to prevent reentrancy
        hasRedeemed[msg.sender] = true;
        tokensRedeemed += totalRedemption;

        // Transfer MARS tokens + gas allowance to user
        (bool success, ) = payable(msg.sender).call{value: totalRedemption}("");
        require(success, "SimpleTokenGrant: Failed to transfer MARS tokens");

        emit TokensRedeemed(msg.sender, totalRedemption);
    }

    /**
     * @dev Update grant parameters
     * Only owner can update
     */
    function updateGrant(uint256 _redemptionAmountPerUser) external onlyOwner {
        redemptionAmountPerUser = _redemptionAmountPerUser;
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

        // Account for gas allowance in calculations
        uint256 gasAllowance = 0.01 ether;
        uint256 totalRedemptionPerUser = redemptionAmountPerUser + gasAllowance;

        return (totalTokensAvailable - tokensRedeemed) / totalRedemptionPerUser;
    }

    /**
     * @dev Get the actual amount users receive (including gas)
     */
    function getTotalRedemptionAmount() external view returns (uint256) {
        uint256 gasAllowance = 0.01 ether;
        return redemptionAmountPerUser + gasAllowance;
    }

    /**
     * @dev Check if an address has already redeemed
     */
    function hasAddressRedeemed(address _user) external view returns (bool) {
        return hasRedeemed[_user];
    }

    /**
     * @dev Emergency withdrawal function
     * Only owner can withdraw remaining funds
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "SimpleTokenGrant: No funds to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "SimpleTokenGrant: Failed to withdraw funds");
    }

    /**
     * @dev Pause the contract
     * Only owner can pause
     */
    function pause() external onlyOwner {
        paused = true;
    }

    /**
     * @dev Unpause the contract
     * Only owner can unpause
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
     * @dev Receive function to accept direct MARS transfers
     * Anyone can fund the contract by sending MARS directly to this address
     */
    receive() external payable {
        require(
            msg.value > 0,
            "SimpleTokenGrant: Must send MARS tokens to fund"
        );
        totalTokensAvailable += msg.value;
        emit GrantFunded(msg.value);
    }
}
