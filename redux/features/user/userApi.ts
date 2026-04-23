import { api } from "../../api/apiSlice";

export const userApi = api.injectEndpoints({
  endpoints: (builder: any) => ({
    // endpoins here

    checkUserExit: builder.mutation({
      query: (body: any) => ({
        url: "check-user-delivery",
        method: "POST",
        body,
      }),
    }),

    registeruser: builder.mutation({
      query: (body: any) => ({
        url: "register-user",
        method: "POST",
        body,
      }),
    }),

    activation: builder.mutation({
      query: (body: any) => ({
        url: "verify-otp",
        method: "POST",
        body,
      }),
    }),

    resendOtp: builder.mutation({
      query: (body: any) => ({
        url: "resent-otp",
        method: "POST",
        body,
      }),
    }),
    // dggdgg

    forgot_password: builder.mutation({
      query: (body: any) => ({
        url: "forgot-password",
        method: "POST",
        body,
      }),
    }),

    reset_password: builder.mutation({
      query: (body: any) => ({
        url: "reset-password",
        method: "POST",
        body,
      }),
    }),

    updateUserData: builder.mutation({
      query: (formData: any) => ({
        url: "update-user-info",
        method: "PUT",
        body: formData,
        credentials: "include" as const,
      }),
    }),

    getVerifiedUsers: builder.query({
      query: () => ({
        url: "get-verified-users",
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    getMyVerifiedRefs: builder.query({
      query: () => ({
        url: "get-my-verified-refs",
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    // Already In use
    updateAvatar: builder.mutation({
      query: (avatar: any) => ({
        url: "update-user-avatar",
        method: "PUT",
        body: avatar,
        credentials: "include" as const,
      }),
    }),

    updateNotificationData: builder.mutation({
      query: ({ notification }: any) => ({
        url: "update-user-info-notification",
        method: "PUT",
        body: { notification },
        credentials: "include" as const,
      }),
    }),
    updatePassword: builder.mutation({
      query: ({ currentPassword, newPassword, id }: any) => ({
        url: `user/${id}/password`,
        method: "PUT",
        body: { currentPassword, newPassword },
        credentials: "include" as const,
      }),
    }),

    getAllUsers: builder.query({
      query: () => ({
        url: "get-users",
        method: "GET",
        credentials: "include" as const,
      }),
    }),
    getUserById: builder.query({
      query: (id: any) => ({
        url: `users/${id}`,
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    deleteMyAccount: builder.mutation({
      query: (userId: any) => ({
        url: `smhos-user/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
    cancelDeletion: builder.mutation({
      query: (id: any) => ({
        url: `smhos-user/${id}/cancel-deletion`,
        method: "PATCH",
      }),
      invalidatesTags: ["User"],
    }),
    getUserStatus: builder.query({
      query: (id: any) => `smhos-user/${id}/status`,
      providesTags: ["User"],
    }),

    updateUserRole: builder.mutation({
      query: ({ role, id, isSuspend, reason }: any) => ({
        url: "update-user-role",
        method: "PUT",
        body: { role, id, isSuspend, reason },
        credentials: "include" as const,
      }),
    }),

    getAddresses: builder.query({
      query: (id: any) => ({
        url: `user/addresses/${id}`,
        method: "GET",
      }),
    }),

    // 2. POST: Add a new address
    addAddress: builder.mutation({
      query: ({ formData, id }: any) => ({
        url: `user/addresses/${id}`,
        method: "POST",
        body: formData,
      }),
    }),

    // 3. PUT: Edit an existing address
    editAddress: builder.mutation({
      query: ({ addressId, id, updates }: any) => ({
        url: `user/${id}/addresses/${addressId}`,
        method: "PUT",
        body: { updates },
      }),
    }),

    // 4. DELETE: Remove a specific address
    removeAddress: builder.mutation({
      query: ({ addressId, id }: any) => ({
        url: `user/${id}/addresses/${addressId}`,
        method: "DELETE",
      }),
    }),
    updatePersonalInfo: builder.mutation({
      query: (data: any) => ({
        url: "verify-rider/personal-info",
        method: "PUT",
        body: data,
      }),
    }),
    updateOtherInfo: builder.mutation({
      query: (data: any) => ({
        url: "verify-rider/other-info",
        method: "PUT",
        body: data,
      }),
    }),

    // Documents
    updateLicense: builder.mutation({
      query: (data: any) => ({
        url: "documents/license",
        method: "PUT",
        body: data,
      }),
    }),

    updateInsurance: builder.mutation({
      query: (data: any) => ({
        url: "documents/insurance",
        method: "PUT",
        body: data,
      }),
    }),

    updateVehicleRegistration: builder.mutation({
      query: (data: any) => ({
        url: "documents/vehicle-registration",
        method: "PUT",
        body: data,
      }),
    }),

    updateNin: builder.mutation({
      query: (data: any) => ({
        url: "documents/nin",
        method: "PUT",
        body: data,
      }),
    }),
    submitForVerification: builder.mutation({
      query: () => ({
        url: "submit-verification",
        method: "POST",
      }),
    }),
    addBank: builder.mutation({
      query: (bankData:any) => ({
        url: 'add-bank',
        method: 'POST',
        body: bankData,
      }),
    }),
    // Delete bank mutation
    deleteBank: builder.mutation({
      query: (bankId:any) => ({
        url: `delete-bank/${bankId}`,
        method: 'DELETE',
      }),
    }),
    getLanguages: builder.query({
      query: () => 'get-languages',
    }),
    updateLanguages: builder.mutation({
      query: (body:any) => ({
        url: 'update-languages',
        method: 'PUT',
        body,
      }),
    }),
    updatePushToken: builder.mutation({
      query: ({ playerId, deviceType }:any) => ({
        url: 'update-push-token',
        method: 'POST',
        body: { playerId, deviceType },
      }),
    }),
  }),
  overrideExisting: false, // Prevents errors if already injected
});

export const {
  useCheckUserExitMutation,
  useRegisteruserMutation,
  useResendOtpMutation,
  useActivationMutation,
  useAddBankMutation, useDeleteBankMutation,
  useGetLanguagesQuery, useUpdateLanguagesMutation,
  // ddgdg
  useCancelDeletionMutation,
  useGetUserStatusQuery,
    useUpdatePushTokenMutation,

  useUpdateAvatarMutation,
  useGetMyVerifiedRefsQuery,
  useUpdateUserDataMutation,
  useUpdateNotificationDataMutation,
  useUpdatePasswordMutation,
  useGetVerifiedUsersQuery,
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useDeleteMyAccountMutation,
  useUpdateUserRoleMutation,

  useGetAddressesQuery,
  useAddAddressMutation,
  useEditAddressMutation,
  useRemoveAddressMutation,

  useForgot_passwordMutation,
  useReset_passwordMutation,
  useUpdatePersonalInfoMutation,
  useUpdateOtherInfoMutation,
  useSubmitForVerificationMutation,
  useUpdateLicenseMutation,
  useUpdateInsuranceMutation,
  useUpdateVehicleRegistrationMutation,
  useUpdateNinMutation,
} = userApi;
