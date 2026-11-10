import * as notificationService from "../services/notification.service.js";

// GET /api/notifications
export async function list(req, res) {
  const [notifications, unreadCount] = await Promise.all([
    notificationService.listNotifications(req.user.id),
    notificationService.countUnread(req.user.id),
  ]);
  res.json({ notifications, unreadCount });
}

// GET /api/notifications/unread-count   (small and fast: used by the bell in the nav bar)
export async function unreadCount(req, res) {
  res.json({ unreadCount: await notificationService.countUnread(req.user.id) });
}

// PATCH /api/notifications/read
export async function markAllRead(req, res) {
  const updated = await notificationService.markAllRead(req.user.id);
  res.json({ updated });
}
