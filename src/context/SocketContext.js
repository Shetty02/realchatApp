"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

let BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
if (BACKEND_URL.endsWith("/")) {
  BACKEND_URL = BACKEND_URL.slice(0, -1);
}
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  // Show a temporary toast and trigger browser notification
  const triggerToast = useCallback((notif) => {
    setToast(notif);
    setTimeout(() => {
      setToast(null);
    }, 4000);

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(notif.title || "New Notification", {
          body: notif.message,
          icon: "/favicon.ico",
        });
      }
    }
  }, []);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (
        Notification.permission !== "granted" &&
        Notification.permission !== "denied"
      ) {
        Notification.requestPermission();
      }
    }

    // Load user from localStorage
    const savedUser = localStorage.getItem("chat_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Initialize socket ONLY when user is authenticated with a token
  useEffect(() => {
    if (!user || !user.token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(BACKEND_URL, {
      auth: {
        token: user.token,
      },
    });

    setSocket(newSocket);

    // Fetch initial notifications with token
    fetch(`${BACKEND_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((res) => res.json())
      .then((data) => setNotifications(data))
      .catch((err) => console.error("Error loading notifications:", err));

    newSocket.on("notification", (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      triggerToast(newNotif);
    });

    newSocket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    // Automatically register user presence on connect
    newSocket.on("connect", () => {
      newSocket.emit("register_user", user.username);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, triggerToast]);

  const login = async (username, password) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    setUser(data);
    localStorage.setItem("chat_user", JSON.stringify(data));
    return data;
  };

  const signup = async (username, password) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");

    setUser(data);
    localStorage.setItem("chat_user", JSON.stringify(data));
    return data;
  };

  const guestLogin = async () => {
    const res = await fetch(`${BACKEND_URL}/api/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Guest Login failed");

    setUser(data);
    localStorage.setItem("chat_user", JSON.stringify(data));
    return data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("chat_user");
    window.location.reload();
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Helper for authenticated fetches
  const authFetch = async (endpoint, options = {}) => {
    if (!user || !user.token) throw new Error("Not authenticated");

    const headers = {
      Authorization: `Bearer ${user.token}`,
      ...(options.headers || {}),
    };

    // Automatically set Content-Type for JSON bodies if not specified
    if (
      options.body &&
      typeof options.body === "string" &&
      !headers["Content-Type"]
    ) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Fetch failed");
    }
    return res.json();
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        user,
        onlineUsers,
        login,
        signup,
        guestLogin,
        logout,
        notifications,
        markAllRead,
        toast,
        triggerToast,
        backendUrl: BACKEND_URL,
        authFetch,
      }}
    >
      {children}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] max-w-sm glass rounded-lg border border-purple-500/30 p-4 shadow-lg shadow-purple-500/10 animate-in slide-in-from-top-5 duration-300">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                {toast.type || "Notification"}
              </span>
              <h4 className="font-semibold text-white mt-1">{toast.title}</h4>
              <p className="text-sm text-gray-300 mt-1">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-white ml-3 text-sm focus:outline-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
};
