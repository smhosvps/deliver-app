import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ThemeState {
  isDarkMode: boolean;
}

const initialState: ThemeState = {
  isDarkMode: false,
};

const THEME_STORAGE_KEY = "isDarkMode"; // Key for AsyncStorage

// Initialize theme by loading from AsyncStorage
export const initializeTheme = createAsyncThunk(
  "theme/initialize", 
  async (_, { rejectWithValue }) => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      return { isDarkMode: storedTheme ? JSON.parse(storedTheme) : false };
    } catch (error) { 
      console.error("Failed to load theme data:", error);
      return rejectWithValue("Failed to load theme data");
    }
  }
);

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.isDarkMode = !state.isDarkMode;
      AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state.isDarkMode)).catch(
        error => console.error("Error saving theme:", error)
      );
    },
    setTheme: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
      AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state.isDarkMode)).catch(
        error => console.error("Error saving theme:", error)
      );
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initializeTheme.fulfilled, (state, action) => {
      if (action.payload && typeof action.payload.isDarkMode === 'boolean') {
        state.isDarkMode = action.payload.isDarkMode;
      }
    });
    // Optionally handle rejected case if needed
    builder.addCase(initializeTheme.rejected, (state) => {
      // Fallback to default theme on error
      state.isDarkMode = false;
    });
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;

export default themeSlice.reducer;