pragma solidity ^0.8.18;

// LayerZeroNotifier.sol
//
// A lightweight LayerZero receiver stub that integrates with SubscriptionScheduler.
// Designed for hackathon/demo usage with the MockLayerZeroEndpoint included in this repo.
// - Receives LayerZero-style messages via `lzReceive`
// - Validates caller is the configured LayerZero endpoint contract and source is trusted
// - Decodes a simple message envelope and calls into `SubscriptionScheduler`
// - Supports two trigger types:
//     1 = TRIGGER_REMINDER  -> calls scheduler.executeReminder(subId)
//     2 = TRIGGER_TOPUP     -> calls scheduler.executeTopUp(subId, amount)
//     3 = NOTIFICATION       -> records/emit notification (no on-chain action)
//
// NOTE: This contract assumes it will be granted the executor role in SubscriptionScheduler
//       (i.e., owner of SubscriptionScheduler must call `setExecutor(address(this), true)`).
//       This file is intended for demo / hackathon use and not production security hardening.
interface ISubscriptionScheduler {
    function executeReminder(uint256 subId) external;
    function executeTopUp(uint256 subId, uint256 amount) external;
}

contract LayerZeroNotifier {
    address public owner;
    // Address of the LayerZero endpoint contract (mock in repo)
    address public lzEndpoint;

    // Trusted remote mapping: chainId => keccak256(remoteAddressBytes) => allowed bool
    mapping(uint16 => mapping(bytes32 => bool)) public trustedRemotes;

    // Connected SubscriptionScheduler
    ISubscriptionScheduler public scheduler;

    // Message types
    uint8 public constant TYPE_TRIGGER_REMINDER = 1;
    uint8 public constant TYPE_TRIGGER_TOPUP = 2;
    uint8 public constant TYPE_NOTIFICATION = 3;

    // Store last notification per subscription for simple debugging/audit
    mapping(uint256 => bytes) public lastNotificationPayload;

    // Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event LayerZeroEndpointSet(address indexed endpoint);
    event TrustedRemoteSet(uint16 indexed srcChainId, bytes srcAddress, bool allowed);
    event SchedulerSet(address indexed scheduler);
    event MessageReceived(uint8 indexed msgType, uint16 indexed srcChainId, bytes srcAddress, uint256 subId, uint256 amount, uint64 nonce);
    event NotificationRecorded(uint256 indexed subId, bytes payload);

    modifier onlyOwner() {
        require(msg.sender == owner, "LayerZeroNotifier: owner only");
        _;
    }

    modifier onlyEndpoint() {
        require(msg.sender == lzEndpoint, "LayerZeroNotifier: caller is not lz endpoint");
        _;
    }

    constructor(address _scheduler, address _lzEndpoint) {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), owner);

        if (_scheduler != address(0)) {
            scheduler = ISubscriptionScheduler(_scheduler);
            emit SchedulerSet(_scheduler);
        }

        if (_lzEndpoint != address(0)) {
            lzEndpoint = _lzEndpoint;
            emit LayerZeroEndpointSet(_lzEndpoint);
        }
    }

    // ============ Admin ============

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setLayerZeroEndpoint(address _endpoint) external onlyOwner {
        lzEndpoint = _endpoint;
        emit LayerZeroEndpointSet(_endpoint);
    }

    /// @notice Register or unregister a trusted remote origin (chainId + srcAddress bytes)
    function setTrustedRemote(uint16 _srcChainId, bytes calldata _srcAddress, bool _allowed) external onlyOwner {
        bytes32 key = keccak256(_srcAddress);
        trustedRemotes[_srcChainId][key] = _allowed;
        emit TrustedRemoteSet(_srcChainId, _srcAddress, _allowed);
    }

    function setSubscriptionScheduler(address _scheduler) external onlyOwner {
        require(_scheduler != address(0), "invalid scheduler");
        scheduler = ISubscriptionScheduler(_scheduler);
        emit SchedulerSet(_scheduler);
    }

    // ============ LayerZero receive entrypoint ============

    /// @notice LayerZero-style receive function. The MockLayerZeroEndpoint in this repo calls this.
    /// @param _srcChainId source chain identifier
    /// @param _srcAddress source address (encoded as bytes)
    /// @param _nonce message nonce
    /// @param _payload abi-encoded payload: abi.encode(uint8 msgType, uint256 subId, uint256 amount, bytes extra)
    ///
    /// Payload format explanation (for this demo):
    /// - msgType: 1 = TRIGGER_REMINDER, 2 = TRIGGER_TOPUP, 3 = NOTIFICATION
    /// - subId: subscription id (as uint256)
    /// - amount: amount (for TOPUP) in smallest units (matching scheduler expectations). Unused for REMINDER/NOTIFICATION.
    /// - extra: optional bytes reserved for proofs or human messages (stored for notifications)
    function lzReceive(uint16 _srcChainId, bytes calldata _srcAddress, uint64 _nonce, bytes calldata _payload) external onlyEndpoint {
        // Validate trusted remote for this srcChainId & address
        bytes32 srcKey = keccak256(_srcAddress);
        require(trustedRemotes[_srcChainId][srcKey], "untrusted remote");

        // Decode payload. For safety, require payload to be abi.encode(uint8, uint256, uint256, bytes)
        // If decoding fails it will revert.
        (uint8 msgType, uint256 subId, uint256 amount, bytes memory extra) = abi.decode(_payload, (uint8, uint256, uint256, bytes));

        // Emit that we received something
        emit MessageReceived(msgType, _srcChainId, _srcAddress, subId, amount, _nonce);

        // Handle message types
        if (msgType == TYPE_TRIGGER_REMINDER) {
            // Trigger the scheduler's reminder execution. This contract must be an authorized executor on the scheduler.
            // If scheduler is not configured, we simply emit the event and store notification.
            if (address(scheduler) != address(0)) {
                // executeReminder is restricted on scheduler; therefore the scheduler owner must grant this contract executor rights
                // (e.g., scheduler.setExecutor(address(this), true)) prior to using this path.
                scheduler.executeReminder(subId);
            } else {
                // store as notification if no scheduler bound
                lastNotificationPayload[subId] = extra;
                emit NotificationRecorded(subId, extra);
            }
        } else if (msgType == TYPE_TRIGGER_TOPUP) {
            if (address(scheduler) != address(0)) {
                // amount is passed through; scheduler will handle checks (spending limits, balances, etc.)
                scheduler.executeTopUp(subId, amount);
            } else {
                lastNotificationPayload[subId] = extra;
                emit NotificationRecorded(subId, extra);
            }
        } else if (msgType == TYPE_NOTIFICATION) {
            // Just store the payload for inspection (proofs, human messages, ipfs hash)
            lastNotificationPayload[subId] = extra;
            emit NotificationRecorded(subId, extra);
        } else {
            // Unknown message type — record as notification for debugging
            lastNotificationPayload[subId] = _payload;
            emit NotificationRecorded(subId, _payload);
        }
    }

    // ============ View helpers ============

    /// @notice Read whether a given srcAddress string/bytes is trusted for a chainId
    function isTrustedRemote(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (bool) {
        return trustedRemotes[_srcChainId][keccak256(_srcAddress)];
    }

    /// @notice Convenience helper to read last stored notification for a subscription
    function getLastNotification(uint256 _subId) external view returns (bytes memory) {
        return lastNotificationPayload[_subId];
    }
}
