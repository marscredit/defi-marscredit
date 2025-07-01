// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PayableTest {
    address public owner;
    uint256 public balance;
    uint256 public number = 42;

    constructor() payable {
        owner = msg.sender;
        balance = msg.value;
    }

    function getNumber() external pure returns (uint256) {
        return 100;
    }

    function getBalance() external view returns (uint256) {
        return balance;
    }
}
