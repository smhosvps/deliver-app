import { api } from "../../api/apiSlice";

export const withdrawalApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // POST /request-withdraw
    requestWithdrawal: builder.mutation({
      query: (body) => ({
        url: 'request-withdraw',
        method: 'POST',
        body, 
      }),
    }), 
    // GET /my-withdrawals
    getMyWithdrawals: builder.query({
      query: () => 'my-withdrawals',
    }),
    // GET /balance
    getMyBalance: builder.query({
      query: () => 'balance',
    }),
  }),
});

export const {
  useRequestWithdrawalMutation,
  useGetMyWithdrawalsQuery,
  useGetMyBalanceQuery,
} = withdrawalApi;