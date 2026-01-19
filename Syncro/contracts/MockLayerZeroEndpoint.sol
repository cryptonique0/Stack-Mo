/*
  SYNCRO - MockLayerZeroEndpoint.sol
  A simple mock of a LayerZero endpoint for local/hackathon testing.

  - Allows sending a cross-chain message (emits SendMsg)
  - Allows the operator to deliver messages to destination contracts by calling `simulateReceive`
  - Tracks per-(chain, address) nonces for inbound/outbound messages
  - Calls `lzReceive(uint16 srcChainId, bytes srcAddress, uint64 nonce, bytes payload)` on destination contracts

  NOTE: This is a testing/mocking contract only. It is NOT secure and omits many LayerZero features.
*/

pragma solidity ^0.8.18;

interface ILayerZeroReceiver {
    // Destination contracts implement this to receive LayerZero-style messages.
    function lzReceive(uint16 _srcChainId, bytes calldata _srcAddress, uint64 _nonce, bytes calldata _payload) external;
}

contract MockLayerZeroEndpoint {
    address public owner;

    // Nonces to simulate LayerZero behavior. We index by chainId and keccak256(address bytes).
    mapping(uint16 => mapping(bytes32 => uint64)) public outboundNonces; // outbound nonces per destination
    mapping(uint16 => mapping(bytes32 => uint64)) public inboundNonces;  // inbound nonces per source

    event SendMsg(
        uint16 indexed srcChainId,
        address indexed from,
        uint16 indexed dstChainId,
        bytes dstAddress,
        uint64 nonce,
        bytes payload
    );

    event ReceiveMsg(
        uint16 indexed srcChainId,
        bytes srcAddress,
        uint16 indexed dstChainId,
        address indexed dstContract,
        uint64 nonce,
        bytes payload
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "MockLZ: owner only");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice Transfer ownership of the mock endpoint (control for delivering messages)
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "MockLZ: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Simulate sending a message to a destination chain/address.
    /// @dev This only records/increments an outbound nonce and emits an event. To actually
    ///      deliver the message to a local destination contract call `simulateReceive`.
    /// @param _dstChainId Destination chain identifier (arbitrary uint16 for tests)
    /// @param _dstAddress Destination contract address encoded as bytes (the same encoding used by LayerZero)
    /// @param _payload Payload to send
    /// @return nonce The assigned outbound nonce for this (dstChainId, dstAddress)
    function send(
        uint16 _dstChainId,
        bytes calldata _dstAddress,
        bytes calldata _payload
    ) external payable returns (uint64 nonce) {
        bytes32 dstKey = keccak256(_dstAddress);
        // increment outbound nonce for this destination
        outboundNonces[_dstChainId][dstKey] += 1;
        nonce = outboundNonces[_dstChainId][dstKey];

        emit SendMsg({
            srcChainId: getCurrentChainIdAsUint16(),
            from: msg.sender,
            dstChainId: _dstChainId,
            dstAddress: _dstAddress,
            nonce: nonce,
            payload: _payload
        });

        return nonce;
    }

    /// @notice Simulate receiving a message from a remote chain and deliver to a destination contract.
    /// @dev Only the owner can call this function in the mock to emulate endpoint behaviour.
    ///      It increments the inbound nonce for the (srcChainId, srcAddress) pair and forwards the call.
    /// @param _srcChainId Source chain id (the chain from which the message originated)
    /// @param _srcAddress Source address encoded as bytes (LayerZero uses bytes for addressing)
    /// @param _dstContract Local destination contract to call `lzReceive` on
    /// @param _payload Payload delivered
    /// @return nonce The nonce used for this inbound message
    function simulateReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        address _dstContract,
        bytes calldata _payload
    ) external onlyOwner returns (uint64 nonce) {
        bytes32 srcKey = keccak256(_srcAddress);
        inboundNonces[_srcChainId][srcKey] += 1;
        nonce = inboundNonces[_srcChainId][srcKey];

        // emit a record before attempting the call
        emit ReceiveMsg({
            srcChainId: _srcChainId,
            srcAddress: _srcAddress,
            dstChainId: getCurrentChainIdAsUint16(),
            dstContract: _dstContract,
            nonce: nonce,
            payload: _payload
        });

        // Forward the message to the destination contract's `lzReceive` function.
        // We require the call to succeed to mimic final delivery semantics in tests.
        ILayerZeroReceiver receiver = ILayerZeroReceiver(_dstContract);
        // Calls into the destination; propagate revert if it fails so tests can detect handling.
        receiver.lzReceive(_srcChainId, _srcAddress, nonce, _payload);

        return nonce;
    }

    /// @notice Convenience function: deliver a previously 'sent' message by specifying explicit nonce.
    /// @dev In some tests you may want to simulate exact nonce ordering; this delivers with provided nonce.
    function deliverWithNonce(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint16 _dstChainId,
        address _dstContract,
        uint64 _nonce,
        bytes calldata _payload
    ) external onlyOwner {
        // emit an event referencing the provided nonce and forward
        emit ReceiveMsg(_srcChainId, _srcAddress, _dstChainId, _dstContract, _nonce, _payload);
        ILayerZeroReceiver(_dstContract).lzReceive(_srcChainId, _srcAddress, _nonce, _payload);
    }

    /// @notice Read the current outbound nonce for a destination address on a chain.
    function getOutboundNonce(uint16 _dstChainId, bytes calldata _dstAddress) external view returns (uint64) {
        return outboundNonces[_dstChainId][keccak256(_dstAddress)];
    }

    /// @notice Read the current inbound nonce for a source address on a chain.
    function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (uint64) {
        return inboundNonces[_srcChainId][keccak256(_srcAddress)];
    }

    /// @dev Helper: returns chain id truncated to uint16 for event readability in this mock
    function getCurrentChainIdAsUint16() internal view returns (uint16) {
        // chainid opcode returns uint256 — safely downcast for mock purposes
        uint256 id;
        assembly {
            id := chainid()
        }
        return uint16(id & 0xffff);
    }
}
