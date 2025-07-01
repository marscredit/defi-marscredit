// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract UltraSimpleTest {
    address public owner;
    uint256 public value;

    constructor() {
        owner = msg.sender;
        value = 42;
    }

    function getValue() external view returns (uint256) {
        return value;
    }
}
