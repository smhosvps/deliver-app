import { api } from "../../api/apiSlice";


export const deliveryStatusApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Mark delivery as picked up (Delivery Partner only)
    markAsAccepted: builder.mutation({
      query: ({ deliveryId, location, userId }) => ({
        url: `delivery-status/${deliveryId}/accepted/${userId}`,
        method: 'PATCH',
        body: location ? { location } : {},
      }),
    }),

    markAsPickedUp: builder.mutation({
      query: ({ deliveryId, location, userId }) => ({
        url: `delivery-status/${deliveryId}/picked-up/${userId}`,
        method: 'PATCH',
        body: location ? { location } : {},
      }),
    }),

    // Mark delivery as in transit (Delivery Partner only)
    markAsInTransit: builder.mutation({
      query: ({ deliveryId, location, userId }) => ({
        url: `delivery-status/${deliveryId}/in-transit/${userId}`,
        method: 'PATCH',
        body: location ? { location } : {},
      }),
    }),

    // Cancel delivery (Customer or Delivery Partner)
    cancelDelivery: builder.mutation({
      query: ({ deliveryId, reason, userId }) => ({
        url: `delivery-status/${deliveryId}/cancel/${userId}`,
        method: 'PATCH',
        body: { reason },
      }),
    }),

    // Confirm delivery by customer
    confirmDeliveryByCustomer: builder.mutation({
      query: ({ deliveryId, code, userId }) => ({
        url: `delivery-status/${deliveryId}/confirm/customer/${userId}`,
        method: 'POST',
        body: { code },
      }),
    }),

    // Confirm delivery by delivery partner
    confirmDeliveryByPartner: builder.mutation({
      query: ({ deliveryId, code, userId }) => ({
        url: `delivery-status/${deliveryId}/confirm/partner/${userId}`,
        method: 'POST',
        body: { code },
      }),
    }),

    // Get delivery confirmation status
    getDeliveryConfirmationStatus: builder.query({
      query: (deliveryId) => ({
        url: `delivery-status/${deliveryId}/confirmation-status`,
        method: 'GET',
      }),
    }),
    cancelMultipleDeliveries: builder.mutation({
      query: (deliveryIds: string[]) => ({
        url: 'cancel-multiple',
        method: 'POST',
        body: { deliveryIds },
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useMarkAsPickedUpMutation,
  useMarkAsInTransitMutation,
  useCancelDeliveryMutation,
  useConfirmDeliveryByCustomerMutation,
  useConfirmDeliveryByPartnerMutation,
  useGetDeliveryConfirmationStatusQuery,
  useCancelMultipleDeliveriesMutation,
  useMarkAsAcceptedMutation
} = deliveryStatusApi;