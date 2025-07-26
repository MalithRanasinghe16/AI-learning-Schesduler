import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { toast } from "react-toastify";
import { apiService, setAuthToken } from "../services/api";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    onSuccess?: () => void
  ) => Promise<void>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    onSuccess?: () => void
  ) => Promise<void>;
  logout: () => void;
  setToken: (token: string | null) => void;
  updatePreferences: (
    preferences: Partial<User["learningPreferences"]>
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        setAuthToken(token);
        const { user } = await apiService.getUser();
        setUser(user);
      } catch (error: any) {
        console.error("AuthContext: Failed to fetch user:", error);
        toast.error(`Failed to fetch user: ${error.message}`);
        setTokenState(null);
        localStorage.removeItem("token");
        setAuthToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem("token", newToken);
      setAuthToken(newToken);
    } else {
      localStorage.removeItem("token");
      setAuthToken(null);
    }
  };

  const login = async (
    email: string,
    password: string,
    onSuccess?: () => void
  ) => {
    setIsLoading(true);
    try {
      const { token } = await apiService.login({ email, password });
      setToken(token);
      const { user } = await apiService.getUser();
      setUser(user);
      toast.success("Logged in successfully!");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("AuthContext: Login error:", error);
      toast.error(`Login failed: ${error.message}`);
      throw error;
    } finally {
      console.log("AuthContext: Login process complete, setting loading false");
      setIsLoading(false);
    }
  };

  const register = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    onSuccess?: () => void
  ) => {
    console.log("AuthContext: Register started");
    setIsLoading(true);
    try {
      const { token } = await apiService.register({
        firstName,
        lastName,
        email,
        password,
      });
      console.log(
        "AuthContext: Token received, setting token and fetching user"
      );
      setToken(token);
      const { user } = await apiService.getUser();
      console.log("AuthContext: User fetched during register:", user);
      setUser(user);
      toast.success("Registered successfully!");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("AuthContext: Register error:", error);
      toast.error(`Registration failed: ${error.message}`);
      throw error;
    } finally {
      console.log(
        "AuthContext: Register process complete, setting loading false"
      );
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log("AuthContext: Logout started");
    try {
      await apiService.logout();
      console.log("AuthContext: Logout API call successful");
    } catch (error: any) {
      console.error("AuthContext: Logout API error:", error);
      toast.error(`Logout failed: ${error.message}`);
    } finally {
      // Always clear local state regardless of API call result
      console.log("AuthContext: Clearing user and token");
      setUser(null);
      setToken(null);
      toast.success("Logged out successfully!");
    }
  };

  const updatePreferences = async (
    preferences: Partial<User["learningPreferences"]>
  ) => {
    try {
      const { user } = await apiService.updatePreferences(preferences);
      setUser(user);
      toast.success("Preferences updated successfully!");
    } catch (error: any) {
      toast.error(`Failed to update preferences: ${error.message}`);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        setToken,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
