import {
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// declare const __DEV__: boolean;

// Define your API base URL based on environment
// For React Native, use your actual API URL, not localhost
// const API_BASE_URL = __DEV__
//   ? Platform.OS === "android"
//     ? "http://10.0.2.2:4000/api/v1/" // Android emulator uses 10.0.2.2 to access host machine
//     : "http://localhost:4000/api/v1/" // iOS simulator can use localhost
//   : "https://referral-api-z1dk.onrender.com/api/v1/"; // Production URL

// Define response types for better type safety
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    // Add other user properties as needed
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiError {
  status: number;
  data: {
    message: string;
  };
}

export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
  // Add other search parameters as needed
}

// Determine the base URL based on platform
const getBaseUrl = () => {
  // Check if we're in development mode
  if (__DEV__) {
    if (Platform.OS === "android") {
      // Use your local IP address for Android device/emulator
      return "http://192.168.102.47:8400/api/v1/";
    } else {
      // iOS simulator can use localhost
      return "http://localhost:8400/api/v1/";
    }
  } else {
    // Production URL - replace with your actual production API URL
    return "https://your-production-api.com/api/v1/";
  }
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    // baseUrl: process.env.EXPO_PUBLIC_API_URL,
    // baseUrl: 'http://localhost:8400/api/v1/',
    baseUrl: getBaseUrl(),
    //   prepareHeaders: (headers, { getState }) => {
    //     const token = (getState() as RootState).auth.token;
    //     if (token) {
    //       headers.set("authorization", `Bearer ${token}`);
    //     }
    //     return headers;
    //   },
    // }),
    prepareHeaders: async (headers) => {
      // Get the token from secure storage
      const token = await SecureStore.getItemAsync("token");

      // If we have a token, add it to the headers
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: ["User", "Listings"],
  endpoints: (builder) => ({
    loginuser: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: "login-delivery",
        method: "POST",
        body: credentials,
      }),
    }),

    appleLogin: builder.mutation({
      query: (credentials) => ({
        url: 'auth/apple',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Other endpoints remain the same
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "logout",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
    googleSignIn: builder.mutation({
      query: (credentials) => ({
        url: 'auth/google',
        method: 'POST',
        body: credentials,
      }),
    }),
    getUser: builder.query<LoginResponse["user"], void>({
      query: () => "user",
      providesTags: ["User"],
    }),
  }),
});

export const { useLoginuserMutation, useLogoutMutation, useGetUserQuery, useAppleLoginMutation, useGoogleSignInMutation} = api;
