import { type Action, configureStore, type ThunkAction } from "@reduxjs/toolkit"
import { api } from "../api/apiSlice"
import authReducer from "../features/auth/authSlice"
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux"
import themeReducer from "../../redux/theme/themeSlice"
import bookmarkReducer from '../../redux/bookmarks/bookMarksSlice'
import cartReducer from '../../redux/cart/cartSlice'
import { setupListeners } from "@reduxjs/toolkit/query"


export const store = configureStore({
  reducer: {
    theme: themeReducer,
    bookmarks: bookmarkReducer, 
    [api.reducerPath]: api.reducer, 
    auth: authReducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these specific action types
        ignoredActions: [
          "api/executeMutation/rejected",
          "api/executeQuery/rejected",
          "api/executeMutation/fulfilled",
          "api/executeQuery/fulfilled",
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: [
          "meta.baseQueryMeta.request",
          "meta.baseQueryMeta.response",
          "payload.request",
          "payload.response",
          "meta.arg",
          "meta.baseQueryMeta",
        ],
        // Ignore these paths in the state
        ignoredPaths: [`${api.reducerPath}.queries`, `${api.reducerPath}.mutations`],
      },
    }).concat(api.middleware),
})

setupListeners(store.dispatch)

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector






