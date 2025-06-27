// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title PaymasterEnabledGrant
 * @dev Enhanced token grant contract that supports paymaster delegation
 * Users can redeem directly OR through authorized paymaster contracts
 */
contract PaymasterEnabledGrant {
    // Events
    event GrantCreated(uint256 redemptionAmount);
    event GrantFunded(uint256 amount);
    event TokensRedeemed(
        address indexed user,
        uint256 amount,
        address indexed sponsor
    );
    event PaymasterAuthorized(address indexed paymaster, bool authorized);

    // State variables
    address public owner;
    uint256 public totalTokensAvailable;
    uint256 public redemptionAmountPerUser;
    uint256 public tokensRedeemed;
    mapping(address => bool) public hasRedeemed;
    mapping(address => bool) public authorizedPaymasters;
    bool public paused;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "PaymasterEnabledGrant: Not the owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "PaymasterEnabledGrant: Contract is paused");
        _;
    }

    modifier onlyAuthorizedPaymaster() {
        require(
            authorizedPaymasters[msg.sender],
            "PaymasterEnabledGrant: Not authorized paymaster"
        );
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
     * @dev Authorize a paymaster contract
     */
    function authorizePaymaster(
        address paymaster,
        bool authorized
    ) external onlyOwner {
        authorizedPaymasters[paymaster] = authorized;
        emit PaymasterAuthorized(paymaster, authorized);
    }

    /**
     * @dev Fund the contract with MARS tokens
     */
    function fundGrant() external payable onlyOwner {
        require(
            msg.value > 0,
            "PaymasterEnabledGrant: Must send MARS tokens to fund"
        );
        totalTokensAvailable += msg.value;
        emit GrantFunded(msg.value);
    }

    /**
     * @dev Direct redemption by user (requires gas)
     */
    function redeemTokens() external whenNotPaused {
        _redeemForUser(msg.sender, msg.sender);
    }

    /**
     * @dev Paymaster-sponsored redemption (gasless for user)
     * Only authorized paymaster contracts can call this
     */
    function redeemForUser(
        address user
    ) external whenNotPaused onlyAuthorizedPaymaster {
        _redeemForUser(user, msg.sender);
    }

    /**
     * @dev Internal redemption logic
     */
    function _redeemForUser(address user, address sponsor) internal {
        require(
            !hasRedeemed[user],
            "PaymasterEnabledGrant: Address has already redeemed"
        );
        require(
            redemptionAmountPerUser > 0,
            "PaymasterEnabledGrant: Redemption amount not set"
        );

        // Add 0.01 MARS for gas fees (covers ~10-20 transactions)
        uint256 gasAllowance = 0.01 ether;
        uint256 totalRedemption = redemptionAmountPerUser + gasAllowance;

        require(
            tokensRedeemed + totalRedemption <= totalTokensAvailable,
            "PaymasterEnabledGrant: Insufficient tokens remaining"
        );

        // Mark as redeemed first to prevent reentrancy
        hasRedeemed[user] = true;
        tokensRedeemed += totalRedemption;

        // Transfer MARS tokens + gas allowance to user
        (bool success, ) = payable(user).call{value: totalRedemption}("");
        require(
            success,
            "PaymasterEnabledGrant: Failed to transfer MARS tokens"
        );

        emit TokensRedeemed(user, totalRedemption, sponsor);
    }

    /**
     * @dev Update grant parameters
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
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "PaymasterEnabledGrant: No funds to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "PaymasterEnabledGrant: Failed to withdraw funds");
    }

    /**
     * @dev Pause/unpause functions
     */
    function pause() external onlyOwner {
        paused = true;
    }

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
     */
    receive() external payable {
        require(
            msg.value > 0,
            "PaymasterEnabledGrant: Must send MARS tokens to fund"
        );
        totalTokensAvailable += msg.value;
        emit GrantFunded(msg.value);
    }
}
