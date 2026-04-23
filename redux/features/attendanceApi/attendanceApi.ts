import { api } from "@/redux/api/apiSlice";

export const attendanceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    markAttendance: builder.mutation({
      query: (attendanceData) => ({
        url: "mark",
        method: "POST",
        body: attendanceData,
      }),
    }),
    getUserAttendance: builder.query({
      query: (userId) => `user-attendance/${userId}`, // Fixed: removed destructuring
    }),
    getModuleAttendance: builder.query({
      query: ({ courseId, moduleId, date }) =>
        `module?courseId=${courseId}&moduleId=${moduleId}${
          date ? `&date=${date}` : ""
        }`,
    }),
    checkTodaysAttendance: builder.query({
      query: ({ userId, courseId, moduleId }) =>
        `check?userId=${userId}&courseId=${courseId}&moduleId=${moduleId}`,
    }),
    getCourseAttendance: builder.query({
      query: ({ courseId }) => `attendance/course/${courseId}`,
    }),
  }),
});

export const {
  useMarkAttendanceMutation,
  useGetUserAttendanceQuery,
  useGetModuleAttendanceQuery,
  useCheckTodaysAttendanceQuery,
  useGetCourseAttendanceQuery
} = attendanceApi;