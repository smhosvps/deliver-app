import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Bookmark {
  _id: string;
  verseNumber: string | number;
  text: string;
  bookName: string;
  chapterNumber: string;
}

interface BookmarkState {
  bookmarks: Bookmark[];
}

const initialState: BookmarkState = {
  bookmarks: [],
};

// AsyncStorage key
const BOOKMARKS_STORAGE_KEY = 'bible_bookmarks';

// Load bookmarks from AsyncStorage
export const loadBookmarks = () => {
  return async (dispatch: any) => {
    try {
      const bookmarksJson = await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (bookmarksJson) {
        const bookmarks = JSON.parse(bookmarksJson);
        dispatch(setBookmarks(bookmarks));
      }
    } catch (error) {
      console.error('Failed to load bookmarks from AsyncStorage:', error);
    }
  };
};

// Save bookmarks to AsyncStorage
const saveBookmarksToStorage = async (bookmarks: Bookmark[]) => {
  try {
    await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (error) {
    console.error('Failed to save bookmarks to AsyncStorage:', error);
  }
};

const bookmarkSlice = createSlice({
  name: 'bookmarks',
  initialState,
  reducers: {
    setBookmarks: (state, action: PayloadAction<Bookmark[]>) => {
      state.bookmarks = action.payload;
    },
    addBookmark: (state, action: PayloadAction<Bookmark>) => {
      const exists = state.bookmarks.some(b => b._id === action.payload._id);
      if (!exists) {
        state.bookmarks.push(action.payload);
        // We can't call async functions directly in reducers,
        // so we'll handle this in middleware or thunks
      }
    },
    removeBookmark: (state, action: PayloadAction<string>) => {
      state.bookmarks = state.bookmarks.filter(b => b._id !== action.payload);
      // We can't call async functions directly in reducers,
      // so we'll handle this in middleware or thunks
    },
  },
});

export const { setBookmarks, addBookmark, removeBookmark } = bookmarkSlice.actions;
export default bookmarkSlice.reducer;

// Thunk action creators for operations with AsyncStorage persistence
export const addBookmarkWithStorage = (bookmark: Bookmark) => {
  return async (dispatch: any, getState: any) => {
    dispatch(addBookmark(bookmark));
    
    // Get updated bookmarks and save to AsyncStorage
    const { bookmarks } = getState().bookmarks;
    await saveBookmarksToStorage(bookmarks);
  };
};

export const removeBookmarkWithStorage = (bookmarkId: string) => {
  return async (dispatch: any, getState: any) => {
    dispatch(removeBookmark(bookmarkId));
    
    // Get updated bookmarks and save to AsyncStorage
    const { bookmarks } = getState().bookmarks;
    await saveBookmarksToStorage(bookmarks);
  };
};