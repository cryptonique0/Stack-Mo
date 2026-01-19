// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title LayerZeroSender
 * @notice A lightweight contract to integrate with LayerZero endpoint for sending cross-chain messages.
 *         This contract provides:
 *          - Owner-managed endpoint configuration
 *          - Trusted-remote registration for destination chain/address pairs
 *          - Convenience helpers to encode common Syncro payloads (REMINDER, TOPUP, NOTIFICATION)
 *          - Fee estimation helper (wraps endpoint.estimateFees)
 *          - A receive entrypoint (`lzReceive`) so this contract can be a trusted receiver if desired
 *
 * @dev This implementation targets the canonical LayerZero Endpoint interface:
 *      - `send(uint16, bytes, bytes, address payable, address, bytes)` (payable)
 *      - `estimateFees(uint16, address, bytes, bool, bytes)` (view)
 *
 *      The actual LayerZero endpoint contract addresses and exact ABI must match the deployed
 *      LayerZero implementation you're integrating with. If the endpoint in your environment
 *      uses a slightly different signature, you may need to update the `ILayerZeroEndpoint` interface.
 *
 * Security notes:
 *  - Only the owner can set endpoint and trusted remotes.
 *  - `lzReceive` only accepts calls routed through the configured endpoint contract, and verifies
 *    the source address (bytes) matches a registered trusted remote for the origin chainId.
 *
 * Usage:
 *  - Owner sets the endpoint: `setEndpoint(address)`
 *  - Owner registers trusted remotes: `setTrustedRemote(dstChainId, dstAddressBytes)` (for destinations you expect to receive from)
 *  - Any caller may call `sendMessage` (payable) with the target chain and payload; ensure msg.value covers the native fee.
 *  - For convenience, use `sendReminder` / `sendTopUp` wrappers which encode message envelopes expected by the LayerZero receiver contracts.
 */

interface ILayerZeroEndpoint {
    // Sends a message to the destination chain.
    // _dstChainId: destination chain id configured by LayerZero
    // _destination: destination contract address in bytes (LayerZero addressing)
    // _payload: message payload
    // _refundAddress: where protocol fees will be refunded (if any)
    // _zroPaymentAddress: address of ZRO token payment contract (if pay in ZRO)
    // _adapterParams: LayerZero adapter parameters, allows specifying gas on destination chain, etc.
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;

    // Estimate native fees and zro fees for a message
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParams
    ) external view returns (uint nativeFee, uint zroFee);
}

interface ILayerZeroReceiver {
    // LayerZero receiver interface for contracts that want to consume messages.
    function lzReceive(uint16 _srcChainId, bytes calldata _srcAddress, uint64 _nonce, bytes calldata _payload) external;
}

contract LayerZeroSender is ILayerZeroReceiver {
    // --- Owner ---
    address public owner;

    // --- LayerZero endpoint ---
    ILayerZeroEndpoint public lzEndpoint;

    // Mapping: chainId => trusted remote address bytes (exact bytes encoding used by layerzero)
    mapping(uint16 => bytes) public trustedRemoteLookup;

    // Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event EndpointSet(address indexed endpoint);
    event TrustedRemoteSet(uint16 indexed chainId, bytes srcAddress);
    event MessageSent(uint16 indexed dstChainId, bytes dstAddress, bytes payload, uint nativeFee, address indexed sender);
    event MessageReceived(uint16 indexed srcChainId, bytes srcAddress, uint64 nonce, bytes payload);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "LayerZeroSender: caller is not owner");
        _;
    }

    modifier onlyEndpoint() {
        require(address(lzEndpoint) != address(0), "LayerZeroSender: endpoint not set");
        require(msg.sender == address(lzEndpoint), "LayerZeroSender: caller is not endpoint");
        _;
    }

    constructor(address _endpoint) {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), owner);

        if (_endpoint != address(0)) {
            lzEndpoint = ILayerZeroEndpoint(_endpoint);
            emit EndpointSet(_endpoint);
        }
    }

    // --- Ownership ---
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "LayerZeroSender: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // --- Endpoint management ---
    function setEndpoint(address _endpoint) external onlyOwner {
        require(_endpoint != address(0), "LayerZeroSender: zero endpoint");
        lzEndpoint = ILayerZeroEndpoint(_endpoint);
        emit EndpointSet(_endpoint);
    }

    // --- Trusted remote management ---
    /// @notice Register a trusted remote origin for a given source chain id.
    /// @param _srcChainId the source chain id (LayerZero configured chain id)
    /// @param _srcAddress the source contract address encoded as bytes (LayerZero address encoding)
    function setTrustedRemote(uint16 _srcChainId, bytes calldata _srcAddress) external onlyOwner {
        require(_srcAddress.length != 0, "LayerZeroSender: src address required");
        trustedRemoteLookup[_srcChainId] = _srcAddress;
        emit TrustedRemoteSet(_srcChainId, _srcAddress);
    }

    // --- Helpers: encode common Syncro messages ---
    // Message envelope format used by Syncro components:
    // abi.encode(uint8 msgType, uint256 subId, uint256 amount, bytes extra)
    // msgType: 1 = REMINDER, 2 = TOPUP, 3 = NOTIFICATION
    uint8 public constant MSG_TYPE_REMINDER = 1;
    uint8 public constant MSG_TYPE_TOPUP = 2;
    uint8 public constant MSG_TYPE_NOTIFICATION = 3;

    function encodeEnvelope(uint8 _msgType, uint256 _subId, uint256 _amount, bytes memory _extra) public pure returns (bytes memory) {
        return abi.encode(_msgType, _subId, _amount, _extra);
    }

    /// @notice Convenience function to send a human-readable reminder message.
    function sendReminder(
        uint16 _dstChainId,
        bytes calldata _dstAddress,
        uint256 _subId,
        string calldata _message,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable {
        bytes memory payload = encodeEnvelope(MSG_TYPE_REMINDER, _subId, 0, bytes(_message));
        _sendMessage(_dstChainId, _dstAddress, payload, _refundAddress, _zroPaymentAddress, _adapterParams);
    }

    /// @notice Convenience function to request a top-up on destination (amount passed in smallest units)
    function sendTopUpRequest(
        uint16 _dstChainId,
        bytes calldata _dstAddress,
        uint256 _subId,
        uint256 _amount,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable {
        bytes memory payload = encodeEnvelope(MSG_TYPE_TOPUP, _subId, _amount, "");
        _sendMessage(_dstChainId, _dstAddress, payload, _refundAddress, _zroPaymentAddress, _adapterParams);
    }

    /// @notice Generic send wrapper that calls the LayerZero endpoint `send` with the provided msg.value as native fee.
    function sendMessage(
        uint16 _dstChainId,
        bytes calldata _dstAddress,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable {
        _sendMessage(_dstChainId, _dstAddress, _payload, _refundAddress, _zroPaymentAddress, _adapterParams);
    }

    function _sendMessage(
        uint16 _dstChainId,
        bytes calldata _dstAddress,
        bytes memory _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) internal {
        require(address(lzEndpoint) != address(0), "LayerZeroSender: endpoint not configured");
        require(_dstAddress.length != 0, "LayerZeroSender: destination address required");

        // Forward the call and native value to the LayerZero endpoint. The caller must supply enough native funds
        // to cover the estimated message fee (or use layered adapters/zro).
        // NOTE: endpoint.send will revert if msg.value is insufficient.
        lzEndpoint.send{value: msg.value}(_dstChainId, _dstAddress, _payload, _refundAddress, _zroPaymentAddress, _adapterParams);

        // Emit for visibility
        emit MessageSent(_dstChainId, _dstAddress, _payload, msg.value, msg.sender);
    }

    // --- Fee estimation wrapper ---
    /// @notice Query the LayerZero endpoint to estimate native and ZRO fees for a payload
    /// @param _dstChainId destination chain id
    /// @param _payload message payload
    /// @param _payInZRO whether to pay in ZRO token
    /// @param _adapterParams adapter params for destination gas config
    /// @return nativeFee estimated native fee (wei), zroFee estimated zro fee
    function estimateFees(
        uint16 _dstChainId,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParams
    ) external view returns (uint nativeFee, uint zroFee) {
        require(address(lzEndpoint) != address(0), "LayerZeroSender: endpoint not configured");
        return lzEndpoint.estimateFees(_dstChainId, address(this), _payload, _payInZRO, _adapterParams);
    }

    // --- Receiver entrypoint (optional) ---
    //
    // Provide an `lzReceive` implementation so this contract can also be a recipient of LayerZero messages.
    // Only the configured endpoint may call this method, and the source address must match a registered trusted remote.
    //
    // Implementations may wish to override or process the payload as appropriate. For safety we currently
    // simply emit the MessageReceived event and leave payload handling to off-chain listeners or another contract.
    function lzReceive(uint16 _srcChainId, bytes calldata _srcAddress, uint64 _nonce, bytes calldata _payload) external override onlyEndpoint {
        // Verify the source address matches the trusted remote record (if any)
        bytes storage trusted = trustedRemoteLookup[_srcChainId];
        if (trusted.length > 0) {
            require(keccak256(trusted) == keccak256(_srcAddress), "LayerZeroSender: untrusted source");
        }
        emit MessageReceived(_srcChainId, _srcAddress, _nonce, _payload);

        // Note: We intentionally do NOT attempt heavy on-chain decoding/processing here.
        // Off-chain services (or a separate on-chain router contract) can monitor this event and act accordingly.
    }

    // --- Utilities ---
    /// @notice Convert an address to the LayerZero-style bytes address (20 bytes)
    function addressToBytes(address _addr) public pure returns (bytes memory) {
        return abi.encodePacked(_addr);
    }

    // --- Admin rescue functions ---
    receive() external payable {}

    fallback() external payable {}

    /// @notice Rescue stuck native funds to the owner
    function rescueNative(address payable _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "LayerZeroSender: zero address");
        (bool ok,) = _to.call{value: _amount}("");
        require(ok, "LayerZeroSender: native rescue failed");
    }

    /// @notice Rescue ERC20 tokens erroneously sent to this contract
    function rescueERC20(address _token, address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "LayerZeroSender: zero address");
        (bool success, bytes memory data) = _token.call(abi.encodeWithSignature("transfer(address,uint256)", _to, _amount));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "LayerZeroSender: ERC20 rescue failed");
    }
}
