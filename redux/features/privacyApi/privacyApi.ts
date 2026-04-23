import { api } from "@/redux/api/apiSlice";

export const privacyApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAllPrivacy: builder.query({
      query: () => 'get-admin-all-privacy',
    }),
  }),
});

export const {
  useGetAllPrivacyQuery,
} = privacyApi;