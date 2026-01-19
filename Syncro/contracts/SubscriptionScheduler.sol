// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// --- Minimal ERC20 interface used by this contract ---
interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function transfer(address to, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

/// @title SubscriptionScheduler
/// @author
/// @notice A simple subscription scheduler contract intended for hackathon demos.
///         Designed to be compatible with an off-chain or specialized executor (e.g. EVVM/MATE)
///         which will call `executeReminder` and `executeTopUp` at scheduled times.
/// @dev This contract holds subscription metadata, allows users to deposit ERC20 funds,
///      and emits scheduling/execution events. Actual integration with EVVM/LayerZero/Providers
///      is achieved off-chain or via an executor that observes events or is granted executor role.
contract SubscriptionScheduler {
    // --- State ---
    address public owner;

    // Executor role: accounts allowed to call execute functions (e.g., EVVM executor)
    mapping(address => bool) public isExecutor;

    uint256 private nextSubscriptionId;

    struct Subscription {
        uint256 id;
        address subscriber; // user who owns this subscription
        string serviceName; // e.g., "Netflix"
        address priceToken; // ERC20 token used for top-ups (e.g., USDC)
        uint256 priceAmount; // units in token's smallest unit (e.g., 18/6 decimals accordingly)
        uint256 renewalTimestamp; // unix epoch of next renewal
        address cardReceiver; // on-chain representation of card provider (mock/demo)
        uint256 spendingLimit; // maximum top-up allowed for this sub (in token units)
        uint256 reminderWindow; // seconds before renewal to send reminder (e.g., 3 days = 3*86400)
        bool active;
        uint256 lastTopUpTimestamp;
        string ipfsHash; // IPFS CID for metadata (for Protocol Labs bounty)
    }

    mapping(uint256 => Subscription) public subscriptions;
    mapping(address => uint256[]) public subscriptionsByOwner;

    // Track deposits (token => user => balance) - simple custodial model for demo
    mapping(address => mapping(address => uint256)) public deposits;

    // --- Events ---
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event ExecutorSet(address indexed executor, bool enabled);

    event SubscriptionAdded(uint256 indexed subId, address indexed subscriber);
    event SubscriptionUpdated(uint256 indexed subId);
    event SubscriptionCancelled(uint256 indexed subId);

    // These events are the integration points for EVVM or other schedulers:
    // Off-chain or on-protocol executors can schedule the corresponding `execute*` calls.
    event ReminderScheduled(uint256 indexed subId, uint256 when);
    event TopUpScheduled(uint256 indexed subId, uint256 when);

    event ReminderExecuted(uint256 indexed subId, uint256 timestamp);
    event TopUpRequested(
        uint256 indexed subId,
        uint256 amount,
        address token,
        address cardReceiver
    );
    event TopUpExecuted(
        uint256 indexed subId,
        uint256 amount,
        address token,
        address cardReceiver,
        uint256 timestamp
    );

    event FundsDeposited(
        address indexed token,
        address indexed user,
        uint256 amount
    );
    event FundsWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Owner only");
        _;
    }

    modifier onlyExecutor() {
        require(isExecutor[msg.sender], "Executor only");
        _;
    }

    modifier onlySubscriber(uint256 subId) {
        require(
            subscriptions[subId].subscriber == msg.sender,
            "Not subscriber"
        );
        _;
    }

    // --- Constructor ---
    constructor() {
        owner = msg.sender;
        nextSubscriptionId = 1;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // --- Admin / Role management ---
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setExecutor(address executor, bool enabled) external onlyOwner {
        isExecutor[executor] = enabled;
        emit ExecutorSet(executor, enabled);
    }

    // --- User fund management (custodial for demo) ---
    /// @notice Deposit ERC20 tokens into the contract to be used for top-ups
    /// @param token ERC20 token address
    /// @param amount Amount to deposit (user must approve first)
    function depositERC20(address token, uint256 amount) external {
        require(amount > 0, "amount>0");
        bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");
        deposits[token][msg.sender] += amount;
        emit FundsDeposited(token, msg.sender, amount);
    }

    /// @notice Withdraw user's deposited tokens (only withdraw their own funds)
    /// @param token ERC20 token address
    /// @param amount Amount to withdraw
    function withdrawERC20(address token, uint256 amount) external {
        require(amount > 0, "amount>0");
        require(deposits[token][msg.sender] >= amount, "insufficient balance");
        deposits[token][msg.sender] -= amount;
        bool ok = IERC20(token).transfer(msg.sender, amount);
        require(ok, "transfer failed");
        emit FundsWithdrawn(token, msg.sender, amount);
    }

    // --- Subscription lifecycle ---
    /// @notice Add a new subscription
    /// @dev Emits events that an off-chain scheduler (or EVVM metaprotocol) can use to schedule future executions.
    /// @param serviceName Human-readable service name
    /// @param priceToken ERC20 token used for payment/top-up
    /// @param priceAmount Amount required to top-up (in token units)
    /// @param renewalTimestamp Next renewal unix timestamp
    /// @param cardReceiver Address representing the debit card provider (mock)
    /// @param spendingLimit Maximum allowed top-up amount for this subscription
    /// @param reminderWindow Seconds before renewal to send reminder (e.g., 3*86400)
    function addSubscription(
        string calldata serviceName,
        address priceToken,
        uint256 priceAmount,
        uint256 renewalTimestamp,
        address cardReceiver,
        uint256 spendingLimit,
        uint256 reminderWindow,
        string calldata ipfsHash // "QmAbc123..." (IPFS CID)
    ) external returns (uint256) {
        require(priceAmount > 0, "price>0");
        require(
            renewalTimestamp > block.timestamp,
            "renewal must be in future"
        );
        require(cardReceiver != address(0), "card receiver required");

        uint256 subId = nextSubscriptionId++;
        Subscription storage s = subscriptions[subId];
        s.id = subId;
        s.subscriber = msg.sender;
        s.serviceName = serviceName;
        s.priceToken = priceToken;
        s.priceAmount = priceAmount;
        s.renewalTimestamp = renewalTimestamp;
        s.cardReceiver = cardReceiver;
        s.spendingLimit = spendingLimit;
        s.reminderWindow = reminderWindow;
        s.active = true;
        s.lastTopUpTimestamp = 0;
        s.ipfsHash = ipfsHash;

        subscriptionsByOwner[msg.sender].push(subId);

        // Emit events that a scheduler can use to create future EVVM async nonces / reminders
        // Off-chain or executor systems should listen to these events and schedule `executeReminder`
        // and `executeTopUp` calls at the appropriate times.
        uint256 reminderWhen = (renewalTimestamp > reminderWindow)
            ? (renewalTimestamp - reminderWindow)
            : block.timestamp;
        uint256 topUpWhen = (renewalTimestamp > 1 days)
            ? (renewalTimestamp - 1 days)
            : block.timestamp;

        emit SubscriptionAdded(subId, msg.sender);
        emit ReminderScheduled(subId, reminderWhen);
        emit TopUpScheduled(subId, topUpWhen);

        return subId;
    }

    /// @notice Update basic subscription parameters
    function updateSubscription(
        uint256 subId,
        uint256 newRenewalTimestamp,
        uint256 newSpendingLimit,
        uint256 newReminderWindow
    ) external onlySubscriber(subId) {
        Subscription storage s = subscriptions[subId];
        require(s.active, "not active");
        if (newRenewalTimestamp != 0) {
            require(
                newRenewalTimestamp > block.timestamp,
                "renewal must be future"
            );
            s.renewalTimestamp = newRenewalTimestamp;
        }
        if (newSpendingLimit != 0) s.spendingLimit = newSpendingLimit;
        if (newReminderWindow != 0) s.reminderWindow = newReminderWindow;

        // reschedule signals
        uint256 reminderWhen = (s.renewalTimestamp > s.reminderWindow)
            ? (s.renewalTimestamp - s.reminderWindow)
            : block.timestamp;
        uint256 topUpWhen = (s.renewalTimestamp > 1 days)
            ? (s.renewalTimestamp - 1 days)
            : block.timestamp;

        emit SubscriptionUpdated(subId);
        emit ReminderScheduled(subId, reminderWhen);
        emit TopUpScheduled(subId, topUpWhen);
    }

    /// @notice Cancel subscription (no further actions)
    function cancelSubscription(uint256 subId) external onlySubscriber(subId) {
        Subscription storage s = subscriptions[subId];
        require(s.active, "already inactive");
        s.active = false;
        emit SubscriptionCancelled(subId);
    }

    // --- Executor callable functions (integration points) ---
    /// @notice Called by an authorized executor when the reminder window arrives.
    /// @dev Executor may be an EVVM agent that was scheduled with async nonces.
    ///      This function simply emits `ReminderExecuted` and could relay a LayerZero message.
    function executeReminder(uint256 subId) external onlyExecutor {
        Subscription storage s = subscriptions[subId];
        require(s.active, "inactive");
        // optionally: check timing tolerance
        emit ReminderExecuted(subId, block.timestamp);

        // Off-chain executor may now send a LayerZero cross-chain message to the subscriber's home chain
        // or the frontend can listen to this event and notify the user.
    }

    /// @notice Called by an authorized executor to perform the top-up.
    /// @param subId subscription identifier
    /// @param requestedAmount amount that executor should top-up (may be equal to priceAmount or user-defined)
    /// @dev The simple model: contract transfers ERC20 tokens from stored `deposits[token][subscriber]`
    ///      to the `cardReceiver` address and emits events. In a real system, cardReceiver would be a
    ///      bridge or provider that credits the user's Visa/Mastercard crypto card.
    function executeTopUp(
        uint256 subId,
        uint256 requestedAmount
    ) external onlyExecutor {
        Subscription storage s = subscriptions[subId];
        require(s.active, "inactive");
        require(requestedAmount > 0, "amount>0");
        require(requestedAmount <= s.spendingLimit, "exceeds spending limit");

        address token = s.priceToken;
        address subscriber = s.subscriber;
        uint256 available = deposits[token][subscriber];
        require(available >= requestedAmount, "insufficient deposited balance");

        // Reduce depositor balance and transfer tokens to cardReceiver
        deposits[token][subscriber] = available - requestedAmount;

        bool ok = IERC20(token).transfer(s.cardReceiver, requestedAmount);
        require(ok, "transfer to cardReceiver failed");

        s.lastTopUpTimestamp = block.timestamp;
        // After top-up, schedule next renewal (naive monthly example: add ~30 days).
        // In real usage the dApp or backend would update renewalTimestamp based on response from Web2 service.
        // Here we do not mutate the renewalTimestamp automatically to avoid assumptions.

        emit TopUpRequested(subId, requestedAmount, token, s.cardReceiver);
        emit TopUpExecuted(
            subId,
            requestedAmount,
            token,
            s.cardReceiver,
            block.timestamp
        );

        // Off-chain executor or provider can now confirm success/failure via LayerZero event/message if desired
    }

    // --- View helpers ---
    /// @notice Returns the subscription IDs owned by an address
    function getSubscriptionsOf(
        address ownerAddr
    ) external view returns (uint256[] memory) {
        return subscriptionsByOwner[ownerAddr];
    }

    /// @notice Helper that suggests when reminder/top-up should occur for a subscription
    function suggestedSchedule(
        uint256 subId
    ) external view returns (uint256 reminderWhen, uint256 topUpWhen) {
        Subscription storage s = subscriptions[subId];
        reminderWhen = (s.renewalTimestamp > s.reminderWindow)
            ? (s.renewalTimestamp - s.reminderWindow)
            : block.timestamp;
        topUpWhen = (s.renewalTimestamp > 1 days)
            ? (s.renewalTimestamp - 1 days)
            : block.timestamp;
        return (reminderWhen, topUpWhen);
    }

    // --- Safety / admin utilities for demo ---
    /// @notice Rescue tokens accidentally sent to contract (admin only)
    function rescueERC20(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "invalid to");
        bool ok = IERC20(token).transfer(to, amount);
        require(ok, "rescue transfer failed");
    }
}
