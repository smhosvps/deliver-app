import { api } from "../../api/apiSlice";

export const accountApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAccounts: builder.query({
      query: () => "get-accounts",
    }),
  }),
});

export const { useGetAccountsQuery } = accountApi;
