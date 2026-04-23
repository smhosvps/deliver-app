import { api } from "../../api/apiSlice";


export const flutterApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFlutterKey: builder.query({
      query: () => "get-key",
    }),
  }),
});

export const { useGetFlutterKeyQuery } =
  flutterApi;
