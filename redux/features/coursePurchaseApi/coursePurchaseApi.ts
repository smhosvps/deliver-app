import { api } from "@/redux/api/apiSlice";

export const enrollmentApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // Create enrollment and initialize payment
    createEnrollment: builder.mutation({
      
      query: (enrollmentData) => ({
        url: "purchase",
        method: "POST",
        body: enrollmentData,
      }),
    }),
 
    // Get user's enrollments
    getMyEnrollments: builder.query({
      query: () => "all-enrollments",
    }),

    // Get enrollment by ID
    getEnrollmentById: builder.query({
      query: (id) => `my-enrollments/${id}`,
    }),

    cancelAndRefundEnrollment: builder.mutation({
      query: ({ enrollmentId, refundAmount, reason }) => ({
        url: `enrollments/${enrollmentId}/refund`,
        method: 'PUT',
        body: { refundAmount, reason },
      }),
    }),

    getPurchasedCourses: builder.query({
      query: (userId) => `user/${userId}/my-courses`,
    }),

    // Delete enrollment
    deleteEnrollment: builder.mutation({
      query: (id) => ({
        url: `delete-enrollments/${id}`,
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useCreateEnrollmentMutation,
  useGetMyEnrollmentsQuery,
  useGetEnrollmentByIdQuery,
  useDeleteEnrollmentMutation,
  useGetPurchasedCoursesQuery,
  useCancelAndRefundEnrollmentMutation 
} = enrollmentApi;