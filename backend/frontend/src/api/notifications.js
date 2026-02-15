import { api } from "./client";

export const notificationsApi = {
  list(params = {}) {
    
    return api.get("/api/notifications/", { params });
  },
  unreadCount() {
    return api.get("/api/notifications/unread-count/");
  },
  markRead(id, is_read = true) {
    return api.patch(`/api/notifications/${id}/`, { is_read });
  },
  markAllRead() {
    return api.post("/api/notifications/mark-all-read/");
  },
};