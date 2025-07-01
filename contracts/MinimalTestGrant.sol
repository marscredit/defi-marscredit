// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title MinimalTestGrant
 * @dev Minimal test grant contract for Mars Credit Network
 */
contract MinimalTestGrant {
    address public owner;
    uint256 public redemptionAmountPerUser;
    uint256 public totalFunded;
    mapping(address => bool) public hasRedeemed;

    event TokensRedeemed(address indexed user, uint256 amount);

    constructor(uint256 _redemptionAmount) {
        owner = msg.sender;
        redemptionAmountPerUser = _redemptionAmount;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function fundGrant() external payable onlyOwner {
        totalFunded += msg.value;
    }

    function redeemTokens() external {
        require(!hasRedeemed[msg.sender], "Already redeemed");
        require(
            address(this).balance >= redemptionAmountPerUser,
            "Insufficient funds"
        );

        hasRedeemed[msg.sender] = true;

        (bool success, ) = payable(msg.sender).call{
            value: redemptionAmountPerUser
        }("");
        require(success, "Transfer failed");

        emit TokensRedeemed(msg.sender, redemptionAmountPerUser);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function hasAddressRedeemed(address _user) external view returns (bool) {
        return hasRedeemed[_user];
    }

    function getRemainingTokens() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        totalFunded += msg.value;
    }
}
