// Subscription service for managing subscription operations

export interface Subscription {
  id: number
  name: string
  category: string
  price: number
  status: "active" | "expiring" | "expired"
  renewsIn: number
  userId: string
  createdAt: Date
}

export class SubscriptionService {
  async getSubscriptions(userId: string): Promise<Subscription[]> {
    const response = await fetch("/api/subscriptions")
    if (!response.ok) throw new Error("Failed to fetch subscriptions")
    const data = await response.json()
    return data.subscriptions
  }

  async createSubscription(subscription: Omit<Subscription, "id" | "createdAt">): Promise<Subscription> {
    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    })
    if (!response.ok) throw new Error("Failed to create subscription")
    const data = await response.json()
    return data.subscription
  }

  async deleteSubscription(id: number): Promise<void> {
    const response = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" })
    if (!response.ok) throw new Error("Failed to delete subscription")
  }

  async updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription> {
    const response = await fetch(`/api/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error("Failed to update subscription")
    const data = await response.json()
    return data.subscription
  }

  calculateTotalSpend(subscriptions: Subscription[]): number {
    return subscriptions.reduce((sum, sub) => sum + sub.price, 0)
  }

  getUpcomingRenewals(subscriptions: Subscription[], days = 7): Subscription[] {
    return subscriptions.filter((sub) => sub.renewsIn <= days && sub.status === "expiring")
  }
}
