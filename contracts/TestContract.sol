// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title TestContract
 * @dev Minimal contract to test deployment on Mars Credit Network
 */
contract TestContract {
    uint256 public value;
    address public owner;

    constructor(uint256 _value) {
        value = _value;
        owner = msg.sender;
    }

    function setValue(uint256 _newValue) external {
        value = _newValue;
    }

    function getValue() external view returns (uint256) {
        return value;
    }
}
