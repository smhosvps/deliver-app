import { api } from "../../api/apiSlice";

export const walletApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Fund wallet endpoint
    fundWallet: builder.mutation({
      query: (body) => ({
        url: 'fund-wallet',
        method: 'POST',
        body,
      }),
    }),

    // Get wallet transactions
    getTransactions: builder.query({
      query: () => 'get-my-transaction',
    }),

    // Get wallet balance
    getWalletBalance: builder.query({
      query: () => 'get-my-wallet',
    }),
  }),
});

export const {
  useFundWalletMutation,
  useGetTransactionsQuery,
  useGetWalletBalanceQuery,
} = walletApi;