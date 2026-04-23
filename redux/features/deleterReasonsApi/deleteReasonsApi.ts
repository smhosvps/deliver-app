import { api } from "../../api/apiSlice";

export const deletionReasonsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        createDeletionReason: builder.mutation({
            query: (body) => ({
                url: 'add-delete-reason',
                method: 'POST',
                body,
            })
        }),
        getDeletionReason: builder.query({
            query: (userId) => `get-delete-reason-by-userId/${userId}`,
        }),
        deleteDeletionReason: builder.mutation({
            query: (userId) => ({
                url: `delete-reason/${userId}`,
                method: 'DELETE',
            }),
        }),
        reverseDeleteDeletionReason: builder.mutation({
            query: (userId) => ({
                url: `reseverse-delete-reason/${userId}`,
                method: 'DELETE',
            }),
        }),
    }),
});

export const {
    useCreateDeletionReasonMutation,
    useGetDeletionReasonQuery,
    useDeleteDeletionReasonMutation,
    useReverseDeleteDeletionReasonMutation
} = deletionReasonsApi;