"use client";
// @ts-nocheck

import {
  ArrowRight,
  Mail,
  Sparkles,
  Package,
  Wallet,
  User,
} from "lucide-react";
import { useState } from "react";

import FetchWithX402 from "../x402/FetchWithX402";

export default function DashboardPage(props: any) {
  const {
    subscriptions,
    totalSpend,
    insights,
    onViewInsights,
    onRenew,
    onManage,
    darkMode,
    emailAccounts,
    duplicates,
    unusedSubscriptions,
    trialSubscriptions,
    userProfile, // New prop for user profile data
    walletInfo, // New prop for wallet information
  } = props;
  const [hoveredCard, setHoveredCard] = useState(null);
  const [filterEmail, setFilterEmail] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showProfileCard, setShowProfileCard] = useState(false);

  const emailAccountsList = [
    "all",
    ...new Set(subscriptions.map((s) => s.email).filter(Boolean)),
  ];

  const searchFiltered = searchTerm
    ? subscriptions.filter((sub) =>
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    : subscriptions;

  const emailFiltered =
    filterEmail === "all"
      ? searchFiltered
      : searchFiltered.filter((sub) => sub.email === filterEmail);

  const filteredSubscriptions =
    filterType === "all"
      ? emailFiltered
      : filterType === "ai"
        ? emailFiltered.filter((sub) => sub.category === "AI Tools")
        : emailFiltered.filter((sub) => sub.category !== "AI Tools");

  const activeSubscriptions = filteredSubscriptions.filter(
    (sub) => sub.status === "active",
  ).length;

  const filteredTotalSpend = filteredSubscriptions.reduce(
    (sum, sub) => sum + sub.price,
    0,
  );

  // Calculate AI vs Other stats
  const aiSubs = emailFiltered.filter((sub) => sub.category === "AI Tools");
  const otherSubs = emailFiltered.filter((sub) => sub.category !== "AI Tools");
  const aiSpend = aiSubs.reduce((sum, sub) => sum + sub.price, 0);
  const otherSpend = otherSubs.reduce((sum, sub) => sum + sub.price, 0);

  const hasNoSubscriptions = subscriptions.length === 0;
  const hasNoResults =
    filteredSubscriptions.length === 0 && subscriptions.length > 0;

  if (hasNoSubscriptions) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4">📦</div>
        <h3
          className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"} mb-2`}
        >
          No subscriptions yet
        </h3>
        <p
          className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"} mb-6 text-center max-w-md`}
        >
          Start tracking your subscriptions by connecting your email or adding
          them manually. We'll help you manage and optimize your spending.
        </p>
        <button
          onClick={() => { }}
          className="bg-[#FFD166] text-[#1E2A35] px-6 py-3 rounded-lg font-semibold hover:bg-[#FFD166]/90 transition-colors"
        >
          Add your first subscription
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* User Profile Header */}
      {userProfile && (
        <div
          className={`${darkMode ? "bg-[#2D3748]" : "bg-white"} rounded-xl p-4 mb-6 border ${darkMode ? "border-gray-700" : "border-gray-200"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 ${darkMode ? "bg-[#1E2A35]" : "bg-gray-100"} rounded-full flex items-center justify-center`}
              >
                <User
                  className={`w-6 h-6 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                />
              </div>
              <div>
                <h3
                  className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                >
                  {userProfile.name || "User"}
                </h3>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {userProfile.email}
                </p>
              </div>
            </div>

            {walletInfo && (
              <>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowProfileCard(!showProfileCard)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${darkMode
                      ? "bg-[#1E2A35] border-gray-700 text-gray-300 hover:bg-[#374151]"
                      : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                      } transition-colors`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm font-mono">
                      {walletInfo.address?.slice(0, 6)}...
                      {walletInfo.address?.slice(-4)}
                    </span>
                  </button>

                  {/* x402 payment button - reusable component */}
                  <div className="ml-4">
                    <FetchWithX402
                      endpoint="https://docs.dapplooker.com/data-apis-for-ai/api-endpoints#multi-interval-technical-analysis"
                      label="Fund Card"
                      maxValue={BigInt(1000000)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Expanded Profile Card */}
          {showProfileCard && walletInfo && (
            <div
              className={`mt-4 pt-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p
                    className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"} mb-1`}
                  >
                    Wallet Address
                  </p>
                  <p
                    className={`text-sm font-mono ${darkMode ? "text-gray-300" : "text-gray-900"}`}
                  >
                    {walletInfo.address}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"} mb-1`}
                  >
                    Wallet Type
                  </p>
                  <p
                    className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-900"}`}
                  >
                    {walletInfo.type === "privy"
                      ? "Embedded Wallet"
                      : walletInfo.type === "metamask"
                        ? "MetaMask"
                        : walletInfo.type === "coinbase_wallet"
                          ? "Coinbase Wallet"
                          : "External Wallet"}
                  </p>
                </div>
                {userProfile.subscriptionCount && (
                  <div>
                    <p
                      className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"} mb-1`}
                    >
                      Reported Subscriptions
                    </p>
                    <p
                      className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-900"}`}
                    >
                      {userProfile.subscriptionCount}
                    </p>
                  </div>
                )}
                {userProfile.monthlySpend && (
                  <div>
                    <p
                      className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"} mb-1`}
                    >
                      Estimated Monthly Spend
                    </p>
                    <p
                      className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-900"}`}
                    >
                      {userProfile.monthlySpend}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === "all"
              ? "bg-[#FFD166] text-[#1E2A35]"
              : darkMode
                ? "bg-[#2D3748] text-gray-400 hover:text-white"
                : "bg-gray-100 text-gray-600 hover:text-gray-900"
              }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("ai")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filterType === "ai"
              ? "bg-[#FFD166] text-[#1E2A35]"
              : darkMode
                ? "bg-[#2D3748] text-gray-400 hover:text-white"
                : "bg-gray-100 text-gray-600 hover:text-gray-900"
              }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Only
          </button>
          <button
            onClick={() => setFilterType("other")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filterType === "other"
              ? "bg-[#FFD166] text-[#1E2A35]"
              : darkMode
                ? "bg-[#2D3748] text-gray-400 hover:text-white"
                : "bg-gray-100 text-gray-600 hover:text-gray-900"
              }`}
          >
            <Package className="w-4 h-4" />
            Other Services
          </button>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD166] ${darkMode
              ? "bg-[#2D3748] border-gray-700 text-white"
              : "bg-white border-gray-300 text-gray-900"
              }`}
          />

          {emailAccountsList.length > 1 && (
            <select
              value={filterEmail}
              onChange={(e) => setFilterEmail(e.target.value)}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD166] ${darkMode
                ? "bg-[#2D3748] border-gray-700 text-white"
                : "bg-white border-gray-300 text-gray-900"
                }`}
            >
              {emailAccountsList.map((email) => (
                <option key={email} value={email}>
                  {email === "all" ? "All Emails" : email}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div
        className={`${darkMode ? "bg-[#1E2A35]" : "bg-[#1E2A35]"} rounded-2xl p-6 mb-8 relative overflow-hidden`}
      >
        <div className="absolute right-0 top-0 w-48 h-48 bg-gray-700 rounded-full -mr-24 -mt-24 opacity-20"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">
                {filterEmail === "all"
                  ? "This Month's Total Spend"
                  : `Spend from ${filterEmail}`}
              </p>
              <h3 className="text-4xl font-bold text-white mb-1">
                ${filteredTotalSpend.toFixed(2)}
              </h3>
              <p className="text-gray-400 text-xs">
                {filteredSubscriptions.length} subscription
                {filteredSubscriptions.length !== 1 ? "s" : ""}
                {filterEmail !== "all" && ` from this email`}
              </p>
            </div>
            <button
              onClick={onViewInsights}
              className="flex items-center gap-2 bg-[#FFD166] text-[#1E2A35] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#FFD166]/90 transition-colors"
            >
              View detailed insights
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#2D3748] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3 h-3 text-[#FFD166]" />
                <span className="text-gray-400 text-xs">AI Tools</span>
              </div>
              <p className="text-xl font-bold text-white">
                ${aiSpend.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400">
                {aiSubs.length} subscriptions
              </p>
            </div>
            <div className="bg-[#2D3748] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-3 h-3 text-[#E86A33]" />
                <span className="text-gray-400 text-xs">Other Services</span>
              </div>
              <p className="text-xl font-bold text-white">
                ${otherSpend.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400">
                {otherSubs.length} subscriptions
              </p>
            </div>
          </div>
        </div>
      </div>

      {hasNoResults && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <h3
            className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"} mb-2`}
          >
            No subscriptions found
          </h3>
          <p
            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"} mb-4`}
          >
            Try adjusting your filters or search term
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setFilterEmail("all");
              setFilterType("all");
            }}
            className={`text-sm ${darkMode ? "text-[#FFD166] hover:text-[#FFD166]/80" : "text-blue-600 hover:text-blue-700"}`}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Subscriptions Grid */}
      {!hasNoResults && (
        <>
          {/* AI Tools Section */}
          {filterType !== "other" && aiSubs.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#FFD166]" />
                <h3
                  className={`text-lg font-semibold ${darkMode ? "text-white" : "text-[#1E2A35]"}`}
                >
                  AI Tools {filterEmail !== "all" && `from ${filterEmail}`}
                </h3>
                <span
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  ({aiSubs.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiSubs.map((sub) => (
                  <div
                    key={sub.id}
                    className={`${darkMode ? "bg-[#2D3748] border-[#374151]" : "bg-white border-gray-200"} border rounded-xl p-5 relative group transition-all duration-200 flex flex-col`}
                    onMouseEnter={() => setHoveredCard(sub.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {sub.isTrial && (
                      <div className="absolute top-3 right-3 bg-[#007A5C] text-white text-xs px-2 py-1 rounded-full font-semibold">
                        Trial
                      </div>
                    )}

                    {sub.priceChange && (
                      <div className="absolute top-3 right-3 bg-[#E86A33] text-white text-xs px-2 py-1 rounded-full font-semibold">
                        Price ↑
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 ${darkMode ? "bg-[#1E2A35]" : "bg-[#1E2A35]"} rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}
                        >
                          {sub.icon}
                        </div>
                        <div>
                          <h4
                            className={`font-semibold ${darkMode ? "text-white" : "text-[#1E2A35]"}`}
                          >
                            {sub.name}
                          </h4>
                          <p
                            className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            {sub.category}
                          </p>
                          {sub.email && (
                            <div className="flex items-center gap-1 mt-1">
                              <Mail
                                className={`w-3 h-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                              />
                              <p
                                className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                              >
                                {sub.email}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`font-bold ${darkMode ? "text-white" : "text-[#1E2A35]"}`}
                        >
                          ${sub.price}
                        </p>
                        <p
                          className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          /Month
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 mb-3">
                      {sub.hasApiKey && sub.lastUsedAt && (
                        <div
                          className={`p-2 ${darkMode ? "bg-[#1E2A35]" : "bg-gray-50"} rounded-lg`}
                        >
                          <p
                            className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"} mb-1`}
                          >
                            Usage Insights
                          </p>
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                            >
                              Last used:{" "}
                              {Math.floor(
                                (new Date() - sub.lastUsedAt) /
                                (1000 * 60 * 60 * 24),
                              )}{" "}
                              days ago
                            </span>
                            <span
                              className={`text-xs font-semibold ${darkMode ? "text-[#007A5C]" : "text-green-600"}`}
                            >
                              Active
                            </span>
                          </div>
                        </div>
                      )}

                      {!sub.hasApiKey && (
                        <div
                          className={`p-2 ${darkMode ? "bg-[#FFD166]/10" : "bg-yellow-50"} rounded-lg`}
                        >
                          <p
                            className={`text-xs ${darkMode ? "text-[#FFD166]" : "text-yellow-700"}`}
                          >
                            Connect API key for usage tracking
                          </p>
                        </div>
                      )}

                      {sub.isTrial && sub.trialEndsAt && (
                        <div className="p-2 bg-[#007A5C]/10 rounded-lg">
                          <p
                            className={`text-xs ${darkMode ? "text-[#007A5C]" : "text-green-700"}`}
                          >
                            Trial ends in{" "}
                            {Math.ceil(
                              (sub.trialEndsAt - new Date()) /
                              (1000 * 60 * 60 * 24),
                            )}{" "}
                            days - ${sub.priceAfterTrial}/month after
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto">
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span
                            className={
                              sub.status === "expiring"
                                ? "text-[#E86A33]"
                                : darkMode
                                  ? "text-gray-400"
                                  : "text-gray-600"
                            }
                          >
                            {sub.status === "expiring"
                              ? `Expires in ${sub.renewsIn} days`
                              : sub.status === "trial"
                                ? "Trial period"
                                : `Renewal in ${sub.renewsIn} days`}
                          </span>
                          <span
                            className={
                              sub.status === "expiring"
                                ? "text-[#E86A33] font-semibold"
                                : sub.status === "trial"
                                  ? "text-[#007A5C] font-semibold"
                                  : "text-[#007A5C] font-semibold"
                            }
                          >
                            {sub.status === "expiring"
                              ? "Expiring"
                              : sub.status === "trial"
                                ? "Trial"
                                : "Active"}
                          </span>
                        </div>
                        <div
                          className={`w-full ${darkMode ? "bg-[#374151]" : "bg-gray-200"} rounded-full h-1`}
                        >
                          <div
                            className={`h-1 rounded-full ${sub.status === "expiring" ? "bg-[#E86A33]" : sub.status === "trial" ? "bg-[#007A5C]" : "bg-[#007A5C]"}`}
                            style={{ width: "75%" }}
                          ></div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          sub.status === "expiring"
                            ? onRenew(sub)
                            : onManage(sub)
                        }
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-all duration-200 ${hoveredCard === sub.id
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-2"
                          } ${sub.status === "expiring"
                            ? darkMode
                              ? "bg-[#E86A33]/20 text-[#E86A33] hover:bg-[#E86A33]/30"
                              : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                            : darkMode
                              ? "bg-[#374151] text-gray-300 hover:bg-[#4B5563]"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        {sub.status === "expiring"
                          ? "Renew now"
                          : "Manage subscription"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
