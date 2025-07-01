// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title EnhancedGaslessGrant
 * @dev Enhanced smart contract for managing MARS token grants with gasless redemptions
 * Supports both public and whitelist modes with paymaster integration for zero gas fees
 */
contract EnhancedGaslessGrant {
    // Events
    event GrantCreated(uint256 redemptionAmount, bool isWhitelistMode);
    event GrantFunded(uint256 amount);
    event TokensRedeemed(address indexed user, uint256 amount);
    event GaslessRedemption(
        address indexed user,
        uint256 amount,
        address indexed paymaster
    );
    event WhitelistUpdated(address indexed user, bool isWhitelisted);
    event ModeChanged(bool isWhitelistMode);
    event PaymasterAuthorized(address indexed paymaster, bool authorized);
    event GrantParametersUpdated(uint256 redemptionAmount);

    // State variables
    address public owner;
    uint256 public totalTokensAvailable;
    uint256 public redemptionAmountPerUser;
    uint256 public tokensRedeemed;
    bool public paused;

    // Mode control
    bool public isWhitelistMode; // true = whitelist only, false = public

    // Paymaster integration
    mapping(address => bool) public authorizedPaymasters;

    // Mappings
    mapping(address => bool) public hasRedeemed;
    mapping(address => bool) public whitelist;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "EnhancedGaslessGrant: Not the owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "EnhancedGaslessGrant: Contract is paused");
        _;
    }

    modifier onlyAuthorizedPaymaster() {
        require(
            authorizedPaymasters[msg.sender],
            "EnhancedGaslessGrant: Not authorized paymaster"
        );
        _;
    }

    // Constructor
    constructor(uint256 _redemptionAmountPerUser, bool _isWhitelistMode) {
        owner = msg.sender;
        redemptionAmountPerUser = _redemptionAmountPerUser;
        isWhitelistMode = _isWhitelistMode;
        paused = false;
        emit GrantCreated(_redemptionAmountPerUser, _isWhitelistMode);
    }

    /**
     * @dev Fund the contract with MARS tokens
     * Only owner can fund the contract
     */
    function fundGrant() external payable onlyOwner {
        require(
            msg.value > 0,
            "EnhancedGaslessGrant: Must send MARS tokens to fund"
        );
        totalTokensAvailable += msg.value;
        emit GrantFunded(msg.value);
    }

    /**
     * @dev Redeem MARS tokens for the caller (regular redemption with gas)
     * Each address can only redeem once
     * Checks whitelist status if in whitelist mode
     */
    function redeemTokens() external whenNotPaused {
        _executeRedemption(msg.sender);
        emit TokensRedeemed(msg.sender, redemptionAmountPerUser);
    }

    /**
     * @dev Redeem MARS tokens for a user (gasless redemption via paymaster)
     * Called by authorized paymaster to enable zero gas fees
     */
    function redeemForUser(
        address user
    ) external whenNotPaused onlyAuthorizedPaymaster {
        _executeRedemption(user);
        emit GaslessRedemption(user, redemptionAmountPerUser, msg.sender);
    }

    /**
     * @dev Internal function to execute redemption logic
     */
    function _executeRedemption(address user) internal {
        require(
            !hasRedeemed[user],
            "EnhancedGaslessGrant: Address has already redeemed"
        );
        require(
            redemptionAmountPerUser > 0,
            "EnhancedGaslessGrant: Redemption amount not set"
        );

        // Check whitelist if in whitelist mode
        if (isWhitelistMode) {
            require(
                whitelist[user],
                "EnhancedGaslessGrant: Address not whitelisted"
            );
        }

        require(
            tokensRedeemed + redemptionAmountPerUser <= totalTokensAvailable,
            "EnhancedGaslessGrant: Insufficient tokens remaining"
        );

        // Mark as redeemed first to prevent reentrancy
        hasRedeemed[user] = true;
        tokensRedeemed += redemptionAmountPerUser;

        // Transfer MARS tokens to user
        (bool success, ) = payable(user).call{value: redemptionAmountPerUser}(
            ""
        );
        require(
            success,
            "EnhancedGaslessGrant: Failed to transfer MARS tokens"
        );
    }

    /**
     * @dev Authorize a paymaster contract (owner only)
     */
    function authorizePaymaster(address _paymaster) external onlyOwner {
        require(
            _paymaster != address(0),
            "EnhancedGaslessGrant: Invalid paymaster"
        );
        authorizedPaymasters[_paymaster] = true;
        emit PaymasterAuthorized(_paymaster, true);
    }

    /**
     * @dev Revoke paymaster authorization (owner only)
     */
    function revokePaymaster(address _paymaster) external onlyOwner {
        authorizedPaymasters[_paymaster] = false;
        emit PaymasterAuthorized(_paymaster, false);
    }

    /**
     * @dev Add address to whitelist (owner only)
     */
    function addToWhitelist(address _user) external onlyOwner {
        require(_user != address(0), "EnhancedGaslessGrant: Invalid address");
        whitelist[_user] = true;
        emit WhitelistUpdated(_user, true);
    }

    /**
     * @dev Add multiple addresses to whitelist (owner only)
     */
    function addMultipleToWhitelist(
        address[] calldata _users
    ) external onlyOwner {
        for (uint256 i = 0; i < _users.length; i++) {
            require(
                _users[i] != address(0),
                "EnhancedGaslessGrant: Invalid address"
            );
            whitelist[_users[i]] = true;
            emit WhitelistUpdated(_users[i], true);
        }
    }

    /**
     * @dev Remove address from whitelist (owner only)
     */
    function removeFromWhitelist(address _user) external onlyOwner {
        whitelist[_user] = false;
        emit WhitelistUpdated(_user, false);
    }

    /**
     * @dev Switch between whitelist and public mode (owner only)
     */
    function setWhitelistMode(bool _isWhitelistMode) external onlyOwner {
        isWhitelistMode = _isWhitelistMode;
        emit ModeChanged(_isWhitelistMode);
    }

    /**
     * @dev Update grant parameters (owner only)
     */
    function updateGrant(uint256 _redemptionAmountPerUser) external onlyOwner {
        redemptionAmountPerUser = _redemptionAmountPerUser;
        emit GrantParametersUpdated(_redemptionAmountPerUser);
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
     * @dev Check if an address is whitelisted
     */
    function isWhitelisted(address _user) external view returns (bool) {
        return whitelist[_user];
    }

    /**
     * @dev Check if user can redeem (considers both redemption status and whitelist)
     */
    function canUserRedeem(address _user) external view returns (bool) {
        if (hasRedeemed[_user]) return false;
        if (isWhitelistMode && !whitelist[_user]) return false;

        return tokensRedeemed + redemptionAmountPerUser <= totalTokensAvailable;
    }

    /**
     * @dev Emergency withdrawal function (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "EnhancedGaslessGrant: No funds to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "EnhancedGaslessGrant: Failed to withdraw funds");
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
            bool whitelistMode,
            bool isPaused
        )
    {
        return (
            totalTokensAvailable,
            redemptionAmountPerUser,
            tokensRedeemed,
            totalTokensAvailable - tokensRedeemed,
            isWhitelistMode,
            paused
        );
    }

    /**
     * @dev Receive function to accept direct MARS transfers
     */
    receive() external payable {
        require(
            msg.value > 0,
            "EnhancedGaslessGrant: Must send MARS tokens to fund"
        );
        totalTokensAvailable += msg.value;
        emit GrantFunded(msg.value);
    }
}
