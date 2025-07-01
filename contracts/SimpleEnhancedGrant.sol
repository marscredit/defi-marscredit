// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleEnhancedGrant {
    address public owner;
    uint256 public redemptionAmountPerUser;
    bool public isActive = true;
    mapping(address => bool) public hasRedeemed;
    mapping(address => bool) public whitelist;
    bool public isWhitelistMode = false;

    event TokensRedeemed(address indexed user, uint256 amount);
    event WhitelistUpdated(address indexed user, bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 _redemptionAmount) payable {
        owner = msg.sender;
        redemptionAmountPerUser = _redemptionAmount;
    }

    function redeemTokens() external {
        require(isActive, "Grant not active");
        require(!hasRedeemed[msg.sender], "Already redeemed");

        if (isWhitelistMode) {
            require(whitelist[msg.sender], "Not whitelisted");
        }

        require(
            address(this).balance >= redemptionAmountPerUser,
            "Insufficient funds"
        );

        hasRedeemed[msg.sender] = true;

        (bool success, ) = msg.sender.call{value: redemptionAmountPerUser}("");
        require(success, "Transfer failed");

        emit TokensRedeemed(msg.sender, redemptionAmountPerUser);
    }

    function addToWhitelist(address user) external onlyOwner {
        whitelist[user] = true;
        emit WhitelistUpdated(user, true);
    }

    function setWhitelistMode(bool _isWhitelistMode) external onlyOwner {
        isWhitelistMode = _isWhitelistMode;
    }

    function setActive(bool _isActive) external onlyOwner {
        isActive = _isActive;
    }

    function fundGrant() external payable onlyOwner {
        // Allows owner to fund the grant
    }

    function withdrawFunds(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    receive() external payable {}
}
