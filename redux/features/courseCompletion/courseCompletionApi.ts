import { api } from "@/redux/api/apiSlice"

export const courseProgressApi = api.injectEndpoints({

  endpoints: (builder) => ({
    // Get all enrolled courses with progress
    getEnrolledCourses: builder.query({
      query: (userId) => `enrolled-courses/${userId}`,
    }),

    // Get specific course progress
    getCourseProgress: builder.query({
      query: (courseId) => `${courseId}/progress`
    }),

    // Generate certificate
    generateCertificate: builder.mutation({
      query: (courseId) => ({
        url: `${courseId}/certificate`,
        method: 'POST',
      }),
    }),

    // Get module quiz results
    getModuleQuizResults: builder.query({
      query: ({ courseId, moduleId }) => 
        `${courseId}/modules/${moduleId}/quiz-results`,
    }),
  }),
});

export const {
  useGetEnrolledCoursesQuery,
  useGetCourseProgressQuery,
  useGenerateCertificateMutation,
  useGetModuleQuizResultsQuery,
} = courseProgressApi;