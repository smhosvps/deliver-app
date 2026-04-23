import { api } from "@/redux/api/apiSlice";


export interface ReportItem {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  deliveryId: string;
  deliveryType: "delivery1" | "delivery2";
  description: string;
  images: string[];
  status: "pending" | "in-progress" | "resolved" | "rejected";
  resolvedNote?: string;
  adminNote?: string;
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportFormData {
  deliveryId: string;
  deliveryType: "delivery1" | "delivery2";
  description: string;
  images?: string[];
}

interface UpdateStatusData {
  status: string;
  resolvedNote?: string;
  adminNote?: string;
}

interface GetAllReportsResponse {
  reports: ReportItem[];
  success: boolean;
}

interface ReportResponse {
  report: ReportItem;
  success: boolean;
  message: string;
}


export const reportApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // User endpoints
    createReport: builder.mutation<ReportResponse, ReportFormData>({
      query: (data) => ({
        url: "create-report",
        method: "POST",
        body: data,
      }),
    }),

    getUserReports: builder.query<GetAllReportsResponse, void>({
      query: () => "user-reports",
    }),

    // Admin endpoints
    getAllReportsAdmin: builder.query<GetAllReportsResponse, void>({
      query: () => "admin/all-reports",
    }),

    getReportById: builder.query<ReportResponse, string>({
      query: (id) => `report/${id}`,
    }),

    updateReportStatus: builder.mutation<
      ReportResponse,
      { id: string; data: UpdateStatusData }
    >({
      query: ({ id, data }) => ({
        url: `admin/update-status/${id}`,
        method: "PATCH",
        body: data,
      }),
    }),

    deleteReport: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `admin/delete-report/${id}`,
        method: "DELETE",
      })
    }),

    uploadImages: builder.mutation<{ images: string[] }, { images: string[] }>({
      query: (data) => ({
        url: "upload-images",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useCreateReportMutation,
  useGetUserReportsQuery,
  useGetAllReportsAdminQuery,
  useGetReportByIdQuery,
  useUpdateReportStatusMutation,
  useDeleteReportMutation,
  useUploadImagesMutation,
} = reportApi;