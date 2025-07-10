// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MarsBridge
 * @dev Bridge contract for Mars Credit Network to Solana
 * Users can lock MARS tokens to mint MARS on Solana
 * Relayers can unlock MARS tokens when users burn MARS on Solana
 */
contract MarsBridge is Ownable, ReentrancyGuard, Pausable {
    // Events
    event TokensLocked(
        address indexed user,
        uint256 amount,
        string solanaRecipient,
        uint256 indexed bridgeId
    );

    event TokensUnlocked(
        address indexed recipient,
        uint256 amount,
        bytes32 indexed solanaTxId,
        uint256 indexed bridgeId
    );

    event BridgeConfigUpdated(
        uint256 minAmount,
        uint256 maxAmount,
        uint256 feePercentage
    );

    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);

    // State variables
    uint256 public bridgeIdCounter;
    uint256 public totalLockedTokens;
    uint256 public minBridgeAmount = 10 ether; // 10 MARS minimum
    uint256 public maxBridgeAmount = 1000000 ether; // 1M MARS maximum
    uint256 public bridgeFeePercentage = 10; // 0.1% (10 basis points)
    uint256 public constant MAX_FEE_PERCENTAGE = 1000; // 10% max fee

    // Mappings
    mapping(address => bool) public authorizedRelayers;
    mapping(bytes32 => bool) public processedSolanaTxs;
    mapping(uint256 => bool) public processedBridgeIds;

    // Modifiers
    modifier onlyRelayer() {
        require(
            authorizedRelayers[msg.sender],
            "MarsBridge: Not authorized relayer"
        );
        _;
    }

    modifier validAmount(uint256 amount) {
        require(amount >= minBridgeAmount, "MarsBridge: Amount below minimum");
        require(amount <= maxBridgeAmount, "MarsBridge: Amount above maximum");
        _;
    }

    constructor() Ownable(msg.sender) {
        bridgeIdCounter = 1;
    }

    /**
     * @dev Lock MARS tokens to bridge to Solana
     * @param amount Amount of MARS tokens to lock
     * @param solanaRecipient Base58 encoded Solana wallet address
     */
    function lockTokens(
        uint256 amount,
        string calldata solanaRecipient
    ) external payable whenNotPaused validAmount(msg.value) nonReentrant {
        require(msg.value == amount, "MarsBridge: Incorrect MARS amount sent");
        require(
            bytes(solanaRecipient).length > 0,
            "MarsBridge: Invalid Solana recipient"
        );

        // Calculate bridge fee
        uint256 bridgeFee = (amount * bridgeFeePercentage) / 10000;
        uint256 bridgeAmount = amount - bridgeFee;

        // Update state
        totalLockedTokens += bridgeAmount;
        uint256 currentBridgeId = bridgeIdCounter++;

        emit TokensLocked(
            msg.sender,
            bridgeAmount,
            solanaRecipient,
            currentBridgeId
        );
    }

    /**
     * @dev Unlock MARS tokens when bridging from Solana (relayer only)
     * @param recipient Address to receive unlocked MARS tokens
     * @param amount Amount of MARS tokens to unlock
     * @param solanaTxId Solana transaction ID as proof of burn
     */
    function unlockTokens(
        address recipient,
        uint256 amount,
        bytes32 solanaTxId
    ) external onlyRelayer whenNotPaused nonReentrant {
        require(recipient != address(0), "MarsBridge: Invalid recipient");
        require(amount > 0, "MarsBridge: Invalid amount");
        require(
            !processedSolanaTxs[solanaTxId],
            "MarsBridge: Transaction already processed"
        );
        require(
            address(this).balance >= amount,
            "MarsBridge: Insufficient contract balance"
        );

        // Mark transaction as processed
        processedSolanaTxs[solanaTxId] = true;
        totalLockedTokens -= amount;
        uint256 currentBridgeId = bridgeIdCounter++;

        // Transfer MARS tokens to recipient
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "MarsBridge: Transfer failed");

        emit TokensUnlocked(recipient, amount, solanaTxId, currentBridgeId);
    }

    /**
     * @dev Add authorized relayer (owner only)
     */
    function addRelayer(address relayer) external onlyOwner {
        require(relayer != address(0), "MarsBridge: Invalid relayer address");
        authorizedRelayers[relayer] = true;
        emit RelayerAdded(relayer);
    }

    /**
     * @dev Remove authorized relayer (owner only)
     */
    function removeRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = false;
        emit RelayerRemoved(relayer);
    }

    /**
     * @dev Update bridge configuration (owner only)
     */
    function updateBridgeConfig(
        uint256 _minAmount,
        uint256 _maxAmount,
        uint256 _feePercentage
    ) external onlyOwner {
        require(_minAmount > 0, "MarsBridge: Invalid min amount");
        require(_maxAmount > _minAmount, "MarsBridge: Invalid max amount");
        require(
            _feePercentage <= MAX_FEE_PERCENTAGE,
            "MarsBridge: Fee too high"
        );

        minBridgeAmount = _minAmount;
        maxBridgeAmount = _maxAmount;
        bridgeFeePercentage = _feePercentage;

        emit BridgeConfigUpdated(_minAmount, _maxAmount, _feePercentage);
    }

    /**
     * @dev Pause bridge operations (owner only)
     */
    function pauseBridge() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause bridge operations (owner only)
     */
    function unpauseBridge() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "MarsBridge: No funds to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "MarsBridge: Emergency withdrawal failed");
    }

    /**
     * @dev Get bridge statistics
     */
    function getBridgeStats()
        external
        view
        returns (
            uint256 totalLocked,
            uint256 contractBalance,
            uint256 bridgeCount,
            uint256 minAmount,
            uint256 maxAmount,
            uint256 feePercentage
        )
    {
        return (
            totalLockedTokens,
            address(this).balance,
            bridgeIdCounter - 1,
            minBridgeAmount,
            maxBridgeAmount,
            bridgeFeePercentage
        );
    }

    /**
     * @dev Check if Solana transaction was processed
     */
    function isSolanaTxProcessed(
        bytes32 solanaTxId
    ) external view returns (bool) {
        return processedSolanaTxs[solanaTxId];
    }

    /**
     * @dev Receive function to accept MARS tokens
     */
    receive() external payable {
        // Allow contract to receive MARS tokens for bridge operations
    }
}
