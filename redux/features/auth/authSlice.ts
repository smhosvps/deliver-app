import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Types
export interface UserAvatar {
  url: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: UserAvatar;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  isAuthenticated: boolean;
}

export interface Credentials {
  user: User;
  token: string;
}

export interface AuthError {
  message: string;
}

const initialState: AuthState = {
  user: null,
  token: null,
  status: "idle",
  error: null,
  isAuthenticated: false,
};

// Async Thunks
export const initializeAuth = createAsyncThunk<
  { token: string | null },
  void,
  { rejectValue: AuthError }
>("auth/initialize", async (_, { rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem("token");
    return { token };
  } catch (error) {
    return rejectWithValue({
      message: "Failed to load authentication data",
    });
  }
});

export const clearCredentials = createAsyncThunk<
  void,
  void,
  { rejectValue: AuthError }
>("auth/clearCredentials", async (_, { rejectWithValue }) => {
  try {
    await AsyncStorage.removeItem("token");
  } catch (error) {
    return rejectWithValue({
      message: "Failed to clear authentication data",
    });
  }
});

// Slice
export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<Credentials>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.status = "succeeded";
      state.error = null;
      AsyncStorage.setItem("token", action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = "idle";
      state.error = null;
    },
    loadToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    resetAuthState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Initialize Auth
      .addCase(initializeAuth.pending, (state) => {
        state.status = "loading";
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.token = action.payload.token;
        state.isAuthenticated = !!action.payload.token;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || "Unknown error occurred";
      })

      // Clear Credentials
      .addCase(clearCredentials.pending, (state) => {
        state.status = "loading";
      })
      .addCase(clearCredentials.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.status = "succeeded"; 
        state.error = null;
      })
      .addCase(clearCredentials.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || "Unknown error occurred";
      });
  },
});

// Actions
export const { setCredentials, logout, loadToken, setUser, resetAuthState } =
  authSlice.actions;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) =>
  state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectAuthStatus = (state: { auth: AuthState }) =>
  state.auth.status;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.isAuthenticated && !!state.auth.token;

export default authSlice.reducer;
