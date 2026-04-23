import { api } from "../../api/apiSlice";

export const deliveryApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // 1. Send Package (Create Delivery)
    createDelivery: builder.mutation({
      query: (deliveryData) => ({
        url: "deliveries",
        method: "POST",
        body: deliveryData,
      }),
    }),

    // 2. Choose Delivery Type
    chooseDeliveryType: builder.mutation({
      query: ({ deliveryId, data }) => ({
        url: `deliveries/${deliveryId}/choose-type`,
        method: "PUT",
        body: data,
      }),
    }),

    payDelivery: builder.mutation({
      query: ({ deliveryId, data }) => ({
        url: `deliveries/${deliveryId}/pay`,
        method: "POST",
        body: data,
      }),
    }),
    // 3. Get Available Delivery Partners
    getCusomerWalletBalance: builder.query({
      query: () => ({
        url: `get-wallet-balance-customer`,
      }),
    }),

    getAvailablePartners: builder.query({
      query: ({ deliveryId, radius }) => {
        // Ensure radius is a number and within limits
        const validatedRadius = Math.min(Math.max(Number(radius) || 5, 3), 10);

        return {
          url: `deliveries/${deliveryId}/available-partners`,
          params: {
            radius: validatedRadius,
          },
        };
      },
    }),

    // 4. Assign Delivery Partner
    assignDeliveryPartner: builder.mutation({
      query: ({ deliveryId, partnerId }) => ({
        url: `deliveries/${deliveryId}/assign`,
        method: "PUT",
        body: { partnerId },
      }),
    }),

    // 5. Get Delivery Details
    getTrackDelivery: builder.query({
      query: (deliveryId) => `deliveries/${deliveryId}/track`,
    }),

    getMyDeliveries: builder.query({
      query: () => `get-delivery`,
    }),

    // 5. Get Delivery Details
    getDelivery: builder.query({
      query: (deliveryId) => `deliveries/${deliveryId}`,
    }),

    // 6. Get User Deliveries
    getUserDeliveries: builder.query({
      query: ({ status, page = 1, limit = 10 }) => ({
        url: "/deliveries/my-deliveries",
        params: { status, page, limit },
      }),
    }),

    // 7. Delivery Partner Specific APIs

    // Update Delivery Partner Status
    updateDeliveryPartnerStatus: builder.mutation({
      query: (data) => ({
        url: "/delivery-partner/status",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    // Update Delivery Partner Location
    updateDeliveryPartnerLocation: builder.mutation({
      query: (location) => ({
        url: "/delivery-partner/location",
        method: "PUT",
        body: location,
      }),
      invalidatesTags: ["User"],
    }),

    // Get Delivery Partner Dashboard
    getDeliveryPartnerDashboard: builder.query({
      query: () => "/delivery-partner/dashboard",
    }),

    // Get Delivery Partner Available Deliveries
    getAvailableDeliveries: builder.query({
      query: ({ page = 1, limit = 10 }) => ({
        url: "/delivery-partner/available-deliveries",
        params: { page, limit },
      }),
    }),

    // Accept Delivery
    acceptDelivery: builder.mutation({
      query: (deliveryId) => ({
        url: `/delivery-partner/deliveries/${deliveryId}/accept`,
        method: "PUT",
      }),
    }),

    // Update Delivery Status
    updateDeliveryStatus: builder.mutation({
      query: ({ deliveryId, status, location }) => ({
        url: `/delivery-partner/deliveries/${deliveryId}/status`,
        method: "PUT",
        body: { status, location },
      }),
    }),

    // Get Delivery Partner Earnings
    getDeliveryPartnerEarnings: builder.query({
      query: ({ startDate, endDate }) => ({
        url: "/delivery-partner/earnings",
        params: { startDate, endDate },
      }),
      providesTags: ["User"],
    }),

    // Request Payout
    requestPayout: builder.mutation({
      query: (data) => ({
        url: "/delivery-partner/payout",
        method: "POST",
        body: data,
      }),
    }),
    // Get Delivery Partner Dashboard
    getCustomerOngoing: builder.query({
      query: (id) => `partner-ongoing-deliveries/${id}`,
    }),
    getCustomerPast: builder.query({
      query: (id) => `partner-past-deliveries/${id}`,
    }),
    deleteDelivery: builder.mutation({
      query: (deliveryId) => ({
        url: `delivery-delete/${deliveryId}/delete`,
        method: "DELETE",
      }),
    }),
    getDeliveryById: builder.query({
      query: (deliveryId) => `delivery-detail-single/${deliveryId}`,
    }),
    // NEW: Edit delivery mutation
    editDelivery: builder.mutation({
      query: ({ deliveryId, data }) => ({
        url: `delivery-detail-edit/${deliveryId}`,
        method: "PUT",
        body: data,
      }),
    }),
    getDeliveryPartnerStats: builder.query({
      query: (partnerId) => `stats/${partnerId}`,
    }),
    refreshStats: builder.mutation<void, string>({
      query: (partnerId) => ({
        url: `partner/stats/${partnerId}`,
        method: 'GET',
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  // Delivery APIs
  useCreateDeliveryMutation,
  useChooseDeliveryTypeMutation,
  useGetAvailablePartnersQuery,
  useAssignDeliveryPartnerMutation,
  useGetDeliveryQuery,
  useGetUserDeliveriesQuery,
  useGetCustomerOngoingQuery,
  useGetCustomerPastQuery,
  useDeleteDeliveryMutation,
  useGetDeliveryByIdQuery,
  useEditDeliveryMutation,
  useGetMyDeliveriesQuery,

  // Delivery Partner APIs
  useUpdateDeliveryPartnerStatusMutation,
  useUpdateDeliveryPartnerLocationMutation,
  useGetDeliveryPartnerDashboardQuery,
  useGetAvailableDeliveriesQuery,
  useAcceptDeliveryMutation,
  useUpdateDeliveryStatusMutation,
  useGetDeliveryPartnerEarningsQuery,
  useRequestPayoutMutation,
  useGetTrackDeliveryQuery,
  usePayDeliveryMutation,
  useGetCusomerWalletBalanceQuery,
  useGetDeliveryPartnerStatsQuery,
  useRefreshStatsMutation,
} = deliveryApi;
