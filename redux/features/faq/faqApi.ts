import { api } from "@/redux/api/apiSlice";


export const faqApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Public: Get all active FAQs
    getFaqs: builder.query({
      query: () => "get-faqs",
    }),
  }),
});

export const {
  useGetFaqsQuery,
} = faqApi;
