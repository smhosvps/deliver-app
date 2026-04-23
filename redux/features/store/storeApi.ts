import { api } from "../../api/apiSlice";

export const storeApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getBooks: builder.query({
      query: () => `all-approved-product`,
    }),
    getBook: builder.query({
      query: (id) => `book-detail/${id}`,
    }),
    getMyBooks: builder.query({
      query: (personal_id) => `get-mybooks/${personal_id}`,
    }),
    createOrder: builder.mutation({
      query: ({ body }:any) => ({
        url: "create-ebook-order",
        method: "POST",
        body,
      }),
    }),
  }),
  overrideExisting: true, // Allow endpoint overrides
});

export const { useGetBooksQuery, useGetBookQuery, useCreateOrderMutation, useGetMyBooksQuery } = storeApi;
