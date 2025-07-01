// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EmptyTest {
    uint256 public number = 1;

    function getNumber() external pure returns (uint256) {
        return 42;
    }
}
