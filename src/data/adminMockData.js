// Admin dashboard mock data
export const users = [
  { id: "1", name: "John Doe", email: "john.doe@gmail.com", signupDate: "2024-01-15", plan: "premium", status: "active" },
  { id: "2", name: "Jane Smith", email: "jane.smith@gmail.com", signupDate: "2024-02-20", plan: "basic", status: "active" },
  { id: "3", name: "Mike Johnson", email: "mike.j@gmail.com", signupDate: "2024-03-10", plan: "free", status: "active" },
  { id: "4", name: "Sarah Williams", email: "sarah.w@gmail.com", signupDate: "2024-01-05", plan: "enterprise", status: "active" },
  { id: "5", name: "Chris Brown", email: "chris.b@gmail.com", signupDate: "2024-04-01", plan: "premium", status: "suspended" },
  { id: "6", name: "Emily Davis", email: "emily.d@gmail.com", signupDate: "2024-02-28", plan: "basic", status: "active" },
  { id: "7", name: "Alex Turner", email: "alex.t@gmail.com", signupDate: "2024-03-22", plan: "free", status: "deactivated" },
  { id: "8", name: "Lisa Anderson", email: "lisa.a@gmail.com", signupDate: "2024-04-15", plan: "premium", status: "active" },
];

export const warnedUsers = [
  { id: "1", name: "Mark Peterson", email: "mark.p@gmail.com", signupDate: "2024-01-10", plan: "basic", status: "active", devicesCount: 5, maxDevices: 3, warningsSent: 1, lastWarning: "2024-12-10" },
  { id: "2", name: "Anna Lee", email: "anna.l@gmail.com", signupDate: "2024-02-05", plan: "premium", status: "active", devicesCount: 8, maxDevices: 5, warningsSent: 2, lastWarning: "2024-12-14" },
  { id: "3", name: "Tom Wilson", email: "tom.w@gmail.com", signupDate: "2024-03-01", plan: "basic", status: "active", devicesCount: 4, maxDevices: 3, warningsSent: 1, lastWarning: "2024-12-12" },
];

export const supportTickets = [
  { id: "1", ticketId: "TKT-001", userName: "John Doe", userEmail: "john.doe@gmail.com", subject: "Unable to generate links", message: "I'm having trouble generating links for my store. The button doesn't respond.", status: "open", createdAt: "2024-12-16", lastUpdated: "2024-12-16" },
  { id: "2", ticketId: "TKT-002", userName: "Sarah Williams", userEmail: "sarah.w@gmail.com", subject: "Billing question", message: "I was charged twice for my subscription. Please refund the extra charge.", status: "in-progress", createdAt: "2024-12-15", lastUpdated: "2024-12-16" },
  { id: "3", ticketId: "TKT-003", userName: "Mike Johnson", userEmail: "mike.j@gmail.com", subject: "Feature request", message: "Would be great to have bulk export functionality.", status: "open", createdAt: "2024-12-14", lastUpdated: "2024-12-14" },
  { id: "4", ticketId: "TKT-004", userName: "Emily Davis", userEmail: "emily.d@gmail.com", subject: "Account recovery", message: "I forgot my password and the reset email isn't working.", status: "resolved", createdAt: "2024-12-13", lastUpdated: "2024-12-15" },
];

export const staffMembers = [
  { id: "1", name: "Admin User", email: "admin@sneaklink.io", role: "admin", permissions: ["all"], addedAt: "2024-01-01", status: "active" },
  { id: "2", name: "Support Agent", email: "support@sneaklink.io", role: "support", permissions: ["tickets", "users.view"], addedAt: "2024-02-15", status: "active" },
  { id: "3", name: "Content Mod", email: "mod@sneaklink.io", role: "moderator", permissions: ["users.view", "users.warn", "tickets"], addedAt: "2024-03-01", status: "active" },
];

export const analyticsData = {
  totalVisitors: 125420,
  activeUsers: 8432,
  premiumUsers: 2156,
  linksGenerated: 456789,
};
