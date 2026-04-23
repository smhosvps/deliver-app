import { api } from "@/redux/api/apiSlice"

export const courseApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createCourse: builder.mutation({
        query: (formData) => {
          return {
            url: "create-course",
            method: "POST",
            body: formData,
          }
        },
      }),

    getCourses: builder.query({
      query: (params = {}) => ({
        url: "courses",
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search,
          category: params.category,
          level: params.level,
          courseType: params.courseType,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        },
      }),
    }),

    getCourseById: builder.query({
      query: (id) => `courses/${id}`,
    }),

    updateCourse: builder.mutation({
      query: ({ id, formData }) => {
        console.log("Updating course with ID:", id)
        console.log("FormData:", formData)
    
        return {
          url: `courses/${id}`,
          method: "PUT",
          body: formData,
        }
      },
    }),

    deleteCourse: builder.mutation({
      query: (id) => ({
        url: `courses/${id}`,
        method: "DELETE",
      }),
    }),

    getCoursesByInstructor: builder.query({
      query: (instructorEmail) => `courses/instructor/${instructorEmail}`,
    }),
    getAllCourses: builder.query({
        query: () => 'courses'
    }),
  }),

})

export const {
  useCreateCourseMutation,
  useGetCoursesQuery,
  useGetCourseByIdQuery,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useGetCoursesByInstructorQuery,
  useGetAllCoursesQuery
} = courseApi