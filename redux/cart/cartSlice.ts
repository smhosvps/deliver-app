import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartItem {
  _id: string;
  quantity: number;
  [key: string]: any; // Allows for additional product properties
}

interface CartState {
  items: CartItem[];
} 

const initialState: CartState = {
  items: [],
};

const CART_STORAGE_KEY = 'cart';

// Initialize cart by loading from AsyncStorage
export const initializeCart = createAsyncThunk(
  'cart/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const storedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      return { items: storedCart ? JSON.parse(storedCart) : [] };
    } catch (error) {
      console.error('Failed to load cart data:', error);
      return rejectWithValue('Failed to load cart data');
    }
  }
);

// Helper function to save cart to AsyncStorage
const saveCartToStorage = async (items: CartItem[]) => {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving cart:', error);
  }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<Omit<CartItem, 'quantity'>>) => {
      const item = state.items.find((i) => i._id === action.payload._id);
      if (item) {
        item.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
      saveCartToStorage(state.items);
    },
    removeFromCart: (state, action: PayloadAction<{ _id: string }>) => {
      const index = state.items.findIndex((i) => i._id === action.payload._id);
      if (index !== -1) {
        state.items.splice(index, 1);
      }
      saveCartToStorage(state.items);
    },
    increaseQuantity: (state, action: PayloadAction<{ _id: string }>) => {
      const item = state.items.find((i) => i._id === action.payload._id);
      if (item) {
        item.quantity += 1;
      }
      saveCartToStorage(state.items);
    },
    decreaseQuantity: (state, action: PayloadAction<{ _id: string }>) => {
      const item = state.items.find((i) => i._id === action.payload._id);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
      }
      saveCartToStorage(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      AsyncStorage.removeItem(CART_STORAGE_KEY).catch(
        error => console.error('Error removing cart:', error)
      );
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initializeCart.fulfilled, (state, action) => {
      if (action.payload && Array.isArray(action.payload.items)) {
        state.items = action.payload.items;
      }
    });
    builder.addCase(initializeCart.rejected, (state) => {
      // Fallback to empty cart on error
      state.items = [];
    });
  },
});

export const {
  addToCart,
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
  clearCart
} = cartSlice.actions;

export default cartSlice.reducer;