// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TokenGrant
 * @dev Smart contract for managing MARS token grants on Mars Credit Network
 * Users can redeem a fixed amount of MARS tokens once per address
 */
contract TokenGrant is Ownable, ReentrancyGuard, Pausable {
    // Events
    event GrantCreated(uint256 totalTokens, uint256 redemptionAmount);
    event GrantFunded(uint256 amount);
    event TokensRedeemed(address indexed user, uint256 amount);
    event GrantUpdated(uint256 totalTokens, uint256 redemptionAmount);

    // State variables
    uint256 public totalTokensAvailable;
    uint256 public redemptionAmountPerUser;
    uint256 public tokensRedeemed;
    mapping(address => bool) public hasRedeemed;

    // Constructor
    constructor(uint256 _redemptionAmountPerUser) Ownable(msg.sender) {
        redemptionAmountPerUser = _redemptionAmountPerUser;
        emit GrantCreated(0, _redemptionAmountPerUser);
    }

    /**
     * @dev Fund the contract with MARS tokens
     * Only owner can fund the contract
     */
    function fundGrant() external payable onlyOwner {
        require(msg.value > 0, "TokenGrant: Must send MARS tokens to fund");
        totalTokensAvailable += msg.value;
        emit GrantFunded(msg.value);
    }

    /**
     * @dev Redeem MARS tokens for the caller
     * Each address can only redeem once
     */
    function redeemTokens() external nonReentrant whenNotPaused {
        require(
            !hasRedeemed[msg.sender],
            "TokenGrant: Address has already redeemed"
        );
        require(
            redemptionAmountPerUser > 0,
            "TokenGrant: Redemption amount not set"
        );
        require(
            tokensRedeemed + redemptionAmountPerUser <= totalTokensAvailable,
            "TokenGrant: Insufficient tokens remaining"
        );

        // Mark as redeemed first to prevent reentrancy
        hasRedeemed[msg.sender] = true;
        tokensRedeemed += redemptionAmountPerUser;

        // Transfer MARS tokens to user
        (bool success, ) = payable(msg.sender).call{
            value: redemptionAmountPerUser
        }("");
        require(success, "TokenGrant: Failed to transfer MARS tokens");

        emit TokensRedeemed(msg.sender, redemptionAmountPerUser);
    }

    /**
     * @dev Update grant parameters
     * Only owner can update
     */
    function updateGrant(uint256 _redemptionAmountPerUser) external onlyOwner {
        redemptionAmountPerUser = _redemptionAmountPerUser;
        emit GrantUpdated(totalTokensAvailable, _redemptionAmountPerUser);
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
        return
            (totalTokensAvailable - tokensRedeemed) / redemptionAmountPerUser;
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
        require(balance > 0, "TokenGrant: No funds to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "TokenGrant: Failed to withdraw funds");
    }

    /**
     * @dev Pause the contract
     * Only owner can pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     * Only owner can unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
