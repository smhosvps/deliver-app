
import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import * as SecureStore from "expo-secure-store"
import { jwtDecode } from "jwt-decode"

// Define types
type User = {
  id: string
  name: string
  email: string
}

type AuthCredentials = {
  user: User
  token: string
}

type AuthContextType = {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setUserCredentials: (credentials: AuthCredentials) => Promise<void>
  logout: () => Promise<void>
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Token storage keys
const TOKEN_KEY = "token"
const USER_KEY = "user"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load stored authentication on startup
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY)
        const storedUser = await SecureStore.getItemAsync(USER_KEY)

        if (storedToken && storedUser) {
          // Check if token is expired
          try {
            const decodedToken = jwtDecode(storedToken)
            const currentTime = Date.now() / 1000

            if (decodedToken.exp && decodedToken.exp < currentTime) {
              // Token expired, clear storage
              await logout()
            } else {
              // Token valid, set auth state
              setToken(storedToken)
              setUser(JSON.parse(storedUser))
            }
          } catch (error) {
            console.log(error)
            // Invalid token, clear storage
            await logout()
          }
        }
      } catch (error) {
        console.error("Failed to load authentication", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStoredAuth()
  }, [])

  // Store authentication data
  const setUserCredentials = async (credentials: AuthCredentials) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, credentials.token)
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(credentials.user))

      setToken(credentials.token)
      setUser(credentials.user)
    } catch (error) {
      console.error("Failed to store authentication", error)
      throw error
    }
  }

  // Clear authentication data
  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      await SecureStore.deleteItemAsync(USER_KEY)

      setToken(null)
      setUser(null)
    } catch (error) {
      console.error("Failed to clear authentication", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        setUserCredentials,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
