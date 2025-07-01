// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract LegacyEnhancedGrant {
    address public owner;
    uint256 public redemptionAmountPerUser;
    bool public isActive;
    mapping(address => bool) public hasRedeemed;
    mapping(address => bool) public whitelist;
    bool public isWhitelistMode;

    event TokensRedeemed(address indexed user, uint256 amount);
    event WhitelistUpdated(address indexed user, bool status);

    constructor(uint256 _redemptionAmount) payable {
        owner = msg.sender;
        redemptionAmountPerUser = _redemptionAmount;
        isActive = true;
        isWhitelistMode = false;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
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

        payable(msg.sender).transfer(redemptionAmountPerUser);

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

    function fundGrant() external payable onlyOwner {}

    function withdrawFunds(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner).transfer(amount);
    }

    receive() external payable {}
}
