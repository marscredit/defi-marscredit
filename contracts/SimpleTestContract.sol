// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleTestContract
 * @dev Ultra-minimal contract for testing deployment functionality
 * This contract is designed to be as small as possible to test basic deployment
 */
contract SimpleTestContract {
    address public owner;
    uint256 public deploymentBlock;
    bool public isDeployed;

    constructor() {
        owner = msg.sender;
        deploymentBlock = block.number;
        isDeployed = true;
    }

    function ping() external pure returns (string memory) {
        return "pong";
    }

    function getInfo() external view returns (address, uint256, bool) {
        return (owner, deploymentBlock, isDeployed);
    }
}
