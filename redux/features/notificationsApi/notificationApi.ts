import { api } from "@/redux/api/apiSlice";


export interface Notification {
  _id: string;
  recipient: string;
  type: string;
  content: string;
  read: boolean;
  status: "unread" | "read";
  createdAt: string;
  updatedAt: string;
}

interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  unreadCount?: number;
}

interface NotificationResponse {
  success: boolean;
  message: string;
  notification?: Notification;
  unreadCount?: number;
}

interface DeleteResponse {
  success: boolean;
  message: string;
  count?: number;
  unreadCount?: number;
}


export const notificationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get user notifications
    getUserNotifications: builder.query<NotificationsResponse, void>({
      query: () => "my-notifications",
    }),

    // Mark notification as read
    markNotificationAsRead: builder.mutation<NotificationResponse, string>({
      query: (id) => ({
        url: `notifications/${id}/mark-read`,
        method: "PUT",
      }),
    }),

    // Mark all notifications as read
    markAllNotificationsAsRead: builder.mutation<DeleteResponse, void>({
      query: () => ({
        url: "notifications/mark-all-read",
        method: "PUT",
      }),
    }),

    // Delete single notification
    deleteNotification: builder.mutation<DeleteResponse, string>({
      query: (id) => ({
        url: `notifications/${id}`,
        method: "DELETE",
      })
    }),

    // Delete all notifications
    deleteAllNotifications: builder.mutation<DeleteResponse, void>({
      query: () => ({
        url: "notifications/delete-all",
        method: "DELETE",
      }),
    }),

    // Delete all read notifications
    deleteAllReadNotifications: builder.mutation<DeleteResponse, void>({
      query: () => ({
        url: "notifications/delete-read",
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useGetUserNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
  useDeleteAllReadNotificationsMutation,
} = notificationApi;