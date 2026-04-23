import { api } from "@/redux/api/apiSlice";

export interface PhoneNumber {
  _id?: string;
  number: string;
  label: string;
  isActive: boolean;
}

export interface ContactSupportItem {
  _id: string;
  email: string;
  phoneNumbers: PhoneNumber[];
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ContactResponse {
  success: boolean;
  message: string;
  contact: ContactSupportItem;
}

export const contactSupportApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Public: Get active contact info
    getContactSupport: builder.query<ContactResponse, void>({
      query: () => "get-contact",
    }),
  }),
});

export const {
  useGetContactSupportQuery
} = contactSupportApi;