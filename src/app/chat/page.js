"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "@/context/SocketContext";
import { useCall } from "@/context/CallContext";
import {
  Send,
  User,
  Hash,
  Users,
  Lock,
  Sparkles,
  AlertCircle,
  Plus,
  LogOut,
  LogIn,
  Home,
  Bell,
  Folder,
  Activity,
  LayoutGrid,
  Link2,
  Crown,
  Settings,
  Info,
  Search,
  SlidersHorizontal,
  MoreVertical,
  Flag,
  ShieldAlert,
  BellOff,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Phone,
  Video,
  UserPlus,
  UserMinus,
  MessageCircle,
  Smile,
  ArrowLeft,
  Menu,
  X,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

export default function ChatPage() {
  const {
    socket,
    backendUrl,
    user,
    onlineUsers,
    login,
    signup,
    guestLogin,
    authFetch,
    logout,
    isLoading: isSessionLoading,
  } = useSocket();
  const { initiateCall } = useCall();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState("general");
  const [activeDmUser, setActiveDmUser] = useState(null);

  // Custom Room State
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  // Settings View
  const [isSettingsView, setIsSettingsView] = useState(false);

  // Auth Form State
  const [isLoginView, setIsLoginView] = useState(true);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingStatus, setTypingStatus] = useState("");
  const messagesEndRef = useRef(null);
  const lastScrolledChatRef = useRef(null);

  // New Features State
  const [friendsList, setFriendsList] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeLightboxMsg, setActiveLightboxMsg] = useState(null);
  const [activeDmUserProfile, setActiveDmUserProfile] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  useEffect(() => {
    if (messages.length === 0) return;

    const currentChatId = activeRoom ? `room:${activeRoom}` : `dm:${activeDmUser}`;

    if (lastScrolledChatRef.current !== currentChatId) {
      // First time loading this chat - scroll instantly to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      lastScrolledChatRef.current = currentChatId;
    } else {
      // New messages arriving in the current active chat - scroll smoothly
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeRoom, activeDmUser]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveLightboxMsg(null);
      }
    };
    if (activeLightboxMsg) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeLightboxMsg]);

  useEffect(() => {
    if (!user) return;
    authFetch("/api/rooms")
      .then((data) => {
        setRooms(data);
      })
      .catch((err) => console.error("Error fetching rooms:", err));

    if (!user.isGuest) {
      authFetch("/api/users/friends")
        .then((data) => setFriendsList(data))
        .catch((err) => console.error("Error fetching friends:", err));

      authFetch("/api/users/requests")
        .then((data) => setFriendRequests(data))
        .catch((err) => console.error("Error fetching requests:", err));

      authFetch("/api/users/sent-requests")
        .then((data) => setSentRequests(data))
        .catch((err) => console.error("Error fetching sent requests:", err));

      authFetch("/api/users/blocked")
        .then((data) => setBlockedUsers(data))
        .catch((err) => console.error("Error fetching blocks:", err));
    }
  }, [user, authFetch]);

  // Clear messages immediately when switching rooms or DM users
  useEffect(() => {
    setMessages([]);
    setTypingStatus("");
    setActiveDmUserProfile(null);
    setEditingMessage(null);
  }, [activeRoom, activeDmUser]);

  // Fetch messages and handle socket joins in the background
  useEffect(() => {
    if (!socket || !user) return;

    if (activeRoom) {
      socket.emit("join_room", activeRoom);
      authFetch(`/api/messages/${activeRoom}`)
        .then((data) => setMessages(data))
        .catch((err) => console.error("Error fetching messages:", err));
    } else if (activeDmUser) {
      authFetch(`/api/private-messages/${user.username}/${activeDmUser}`)
        .then((data) => setMessages(data))
        .catch((err) => console.error("Error fetching DM messages:", err));

      authFetch(`/api/users/profile/${activeDmUser}`)
        .then((data) => setActiveDmUserProfile(data))
        .catch((err) => console.error("Error fetching profile details:", err));

      socket.emit("mark_messages_read", {
        from: activeDmUser,
        to: user.username
      });
    }
  }, [socket, user, activeRoom, activeDmUser, authFetch]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleReceiveMessage = (msg) => {
      if (activeRoom && msg.roomId === activeRoom) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleReceivePrivateMessage = (msg) => {
      if (activeDmUser) {
        const matchesCurrentDm =
          (msg.from.toLowerCase() === user.username.toLowerCase() &&
            msg.to.toLowerCase() === activeDmUser.toLowerCase()) ||
          (msg.from.toLowerCase() === activeDmUser.toLowerCase() &&
            msg.to.toLowerCase() === user.username.toLowerCase());

        if (matchesCurrentDm) {
          setMessages((prev) => [...prev, msg]);
          if (msg.from.toLowerCase() === activeDmUser.toLowerCase()) {
            socket.emit("mark_messages_read", {
              from: activeDmUser,
              to: user.username
            });
          }
        }
      }
    };

    const handleUserTyping = (data) => {
      if (activeRoom && data.roomId === activeRoom) {
        setTypingStatus(data.user);
      } else if (
        activeDmUser &&
        data.fromUsername &&
        data.fromUsername.toLowerCase() === activeDmUser.toLowerCase()
      ) {
        setTypingStatus(data.fromUsername);
      }
    };

    const handleUserStopTyping = () => {
      setTypingStatus("");
    };

    const handleRoomCreated = (newRoom) => {
      setRooms((prev) => {
        if (prev.find((r) => r.id === newRoom.id)) return prev;
        return [...prev, newRoom];
      });
    };

    const handleNewFriendRequest = (data) => {
      if (user && data.to.toLowerCase() === user.username.toLowerCase()) {
        setFriendRequests((prev) => {
          if (!prev.includes(data.from)) {
            toast(`${data.from} sent you a friend request!`, { icon: "👋" });
            return [...prev, data.from];
          }
          return prev;
        });
      }
    };

    const handleUserLastSeenUpdate = (data) => {
      if (activeDmUser && data.username.toLowerCase() === activeDmUser.toLowerCase()) {
        setActiveDmUserProfile(prev => prev ? { ...prev, lastSeen: data.lastSeen } : { username: activeDmUser, lastSeen: data.lastSeen });
      }
    };

    const handleMessageStatusUpdate = (data) => {
      if (data.from.toLowerCase() === user.username.toLowerCase() &&
        activeDmUser && data.to.toLowerCase() === activeDmUser.toLowerCase()) {
        setMessages(prev => prev.map(msg => {
          if (msg.from === user.username || msg.user === user.username) {
            if (data.status === 'read' || (data.status === 'delivered' && msg.status !== 'read')) {
              return { ...msg, status: data.status };
            }
          }
          return msg;
        }));
      }
    };

    const handleMessageEdited = (editedMsg) => {
      setMessages(prev => prev.map(m => (m.id === editedMsg.id || m._id === editedMsg.id || m._id === editedMsg._id) ? editedMsg : m));
    };

    const handleMessageDeleted = (deletedMsg) => {
      setMessages(prev => prev.map(m => (m.id === deletedMsg.id || m._id === deletedMsg.id || m._id === deletedMsg._id) ? deletedMsg : m));
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("receive_private_message", handleReceivePrivateMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("room_created", handleRoomCreated);
    socket.on("new_friend_request", handleNewFriendRequest);
    socket.on("user_last_seen_update", handleUserLastSeenUpdate);
    socket.on("message_status_update", handleMessageStatusUpdate);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("receive_private_message", handleReceivePrivateMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("room_created", handleRoomCreated);
      socket.off("new_friend_request", handleNewFriendRequest);
      socket.off("user_last_seen_update", handleUserLastSeenUpdate);
      socket.off("message_status_update", handleMessageStatusUpdate);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, [socket, user, activeRoom, activeDmUser]);

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!socket || !user) return;

    if (activeRoom) {
      socket.emit("typing", { roomId: activeRoom, user: user.username });
    } else if (activeDmUser) {
      socket.emit("private_typing", { to: activeDmUser, from: user.username });
    }

    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      if (activeRoom) {
        socket.emit("stop_typing", { roomId: activeRoom });
      } else if (activeDmUser) {
        socket.emit("stop_private_typing", { to: activeDmUser });
      }
    }, 1500);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const res = await fetch(`${backendUrl}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });
      if (res.ok) {
        setNewRoomName("");
        setIsCreatingRoom(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinRoom = async () => {
    if (!activeRoom || user.isGuest) return;
    try {
      const res = await fetch(`${backendUrl}/api/rooms/${activeRoom}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const updatedRoom = await res.json();
        setRooms((prev) =>
          prev.map((r) => (r.id === activeRoom ? updatedRoom : r)),
        );
        authFetch(`/api/messages/${activeRoom}`)
          .then((data) => setMessages(data))
          .catch((err) => console.error("Error fetching messages:", err));
      }
    } catch (err) {
      console.error(err);
    }
  };
  console.log("test");
  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    try {
      const res = await fetch(`${backendUrl}/api/rooms/${activeRoom}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const updatedRoom = await res.json();
        setRooms((prev) =>
          prev.map((r) => (r.id === activeRoom ? updatedRoom : r)),
        );
        setActiveRoom(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setNewMessage(msg.text || "");
  };

  const handleDeleteMessage = (messageId) => {
    if (confirm("Are you sure you want to delete this message?")) {
      socket.emit("delete_message", {
        messageId,
        isPrivate: !!activeDmUser
      });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !socket || !user) return;

    if (user.isGuest) {
      logout();
      return;
    }

    if (editingMessage) {
      socket.emit("edit_message", {
        messageId: editingMessage.id || editingMessage._id,
        text: newMessage,
        isPrivate: !!activeDmUser
      });
      setEditingMessage(null);
      setNewMessage("");
      return;
    }

    let uploadedFileUrl = null;
    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const res = await fetch(`${backendUrl}/api/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${user.token}` },
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          uploadedFileUrl = data.url;
        } else {
          toast.error("Failed to upload file");
        }
      } catch (err) {
        toast.error("Error uploading file");
      }
      setIsUploading(false);
      setSelectedFile(null);
    }

    if (activeRoom) {
      socket.emit("send_message", {
        roomId: activeRoom,
        user: user.username,
        text: newMessage,
        fileUrl: uploadedFileUrl,
        replyTo: replyToMessage,
      });
      socket.emit("stop_typing", { roomId: activeRoom });
    } else if (activeDmUser) {
      socket.emit("send_private_message", {
        to: activeDmUser,
        from: user.username,
        text: newMessage,
        fileUrl: uploadedFileUrl,
        replyTo: replyToMessage,
      });

      socket.emit("stop_private_typing", { to: activeDmUser });
    }
    setNewMessage("");
    setReplyToMessage(null);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${backendUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();

        // Update user avatarUrl in DB
        await authFetch("/api/users/update-avatar", {
          method: "PUT",
          body: JSON.stringify({ avatarUrl: data.url }),
        });

        // Update local user state
        login({ ...user, avatarUrl: data.url }, user.token);
        toast.success("Avatar updated successfully!");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(
          `Failed to upload avatar: ${errData.error || res.statusText}`,
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(`Error uploading avatar: ${err.message}`);
    }
    setIsUploadingAvatar(false);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setIsLoading(true);
    try {
      if (isLoginView) {
        await login(authUsername, authPassword);
      } else {
        await signup(authUsername, authPassword);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const currentPassword = e.target.currentPassword.value;
    const newPassword = e.target.newPassword.value;
    try {
      const res = await fetch(`${backendUrl}/api/users/update-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Password updated successfully!");
        e.target.reset();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update password");
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to permanently delete your account? This action cannot be undone.",
      )
    )
      return;
    try {
      const res = await fetch(`${backendUrl}/api/users/delete-account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        logout();
      } else {
        alert("Failed to delete account");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getAvatarGradient = (name) => {
    if (!name) return "from-gray-700 to-gray-800";
    const colors = [
      "from-purple-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-pink-500 to-rose-600",
      "from-amber-500 to-orange-600",
      "from-blue-500 to-cyan-600",
    ];
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatLastSeen = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `today at ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    if (isYesterday) {
      return `yesterday at ${timeStr}`;
    }

    return `${date.toLocaleDateString()} at ${timeStr}`;
  };

  const activeTitle = activeRoom
    ? rooms.find((r) => r.id === activeRoom)?.name || "Channel"
    : activeDmUser || "Chat";

  if (isSessionLoading) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-[12px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-[12px] pointer-events-none" />
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin relative z-10" />
        <p className="mt-4 text-slate-500 font-semibold text-sm animate-pulse relative z-10">Connecting to portal...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-[12px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-[12px] pointer-events-none" />

        <div className="w-full max-w-md bg-white rounded-[2rem] p-8 border border-slate-200 relative z-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-[12px] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/10">
              <Sparkles className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-slate-500 text-sm">
              Enter your details to continue
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-4 rounded-[12px] bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{authError}</p>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1">
                Username
              </label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-100 border border-slate-300 rounded-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600/50 focus:bg-slate-50 transition-all"
                placeholder="johndoe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1">
                Password
              </label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-100 border border-slate-300 rounded-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600/50 focus:bg-slate-50 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.15)]"
            >
              {isLoading
                ? "Processing..."
                : isLoginView
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-slate-500 flex flex-col items-center gap-4">
            {isLoginView ? (
              <p>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => {
                    setIsLoginView(false);
                    setAuthError("");
                  }}
                  className="text-slate-900 hover:text-blue-600 font-medium transition-colors"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already registered?{" "}
                <button
                  onClick={() => {
                    setIsLoginView(true);
                    setAuthError("");
                  }}
                  className="text-slate-900 hover:text-blue-600 font-medium transition-colors"
                >
                  Log in
                </button>
              </p>
            )}

            <div className="w-full border-t border-slate-200"></div>

            <button
              onClick={async () => {
                try {
                  await guestLogin();
                } catch (e) {
                  setAuthError("Guest login failed");
                }
              }}
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              Preview UI as{" "}
              <span className="text-blue-600 font-medium underline decoration-blue-500/30 underline-offset-4">
                Guest
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden w-full bg-white text-slate-900 lg:gap-3 p-0 lg:p-3">
      {/* Mobile Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* 1. Thin Navigation Sidebar */}
      <div
        className={`w-[80px] bg-slate-50 md:rounded-[12px] flex-col items-center py-8 gap-8 border-r md:border border-slate-200 shrink-0 md:flex ${showMobileMenu ? "flex absolute left-0 top-0 bottom-0 z-50 h-full shadow-2xl md:static md:h-auto md:shadow-none bg-white md:bg-slate-50" : "hidden"}`}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-[12px] flex items-center justify-center shadow-lg shadow-blue-900/10 mb-4 cursor-pointer">
          <Sparkles className="w-5 h-5 text-black" />
        </div>

        <div className="flex flex-col items-center gap-6 text-slate-400 flex-1 w-full">
          <button
            onClick={() => setIsSettingsView(false)}
            className={`relative group transition-colors ${!isSettingsView ? "text-slate-900" : "hover:text-slate-900"}`}
            title="Chat"
          >
            <MessageCircle className="w-6 h-6" />
            {!isSettingsView && (
              <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
            )}
          </button>
          <button
            onClick={() => toast("Notifications")}
            className="hover:text-slate-900 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-6 h-6" />
            {friendRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>
          <button
            onClick={() => setIsSettingsView(false)}
            className={`hover:text-slate-900 transition-colors ${!isSettingsView ? "text-slate-900" : ""}`}
            title="Friends"
          >
            <Users className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-6 text-slate-400 w-full mt-auto">
          <button
            onClick={() => setIsSettingsView(true)}
            className={`relative group transition-colors ${isSettingsView ? "text-slate-900" : "hover:text-slate-900"}`}
            title="Settings"
          >
            <Settings className="w-6 h-6" />
            {isSettingsView && (
              <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
            )}
          </button>
          <button
            onClick={logout}
            className="hover:text-red-400 transition-colors mt-2"
            title="Logout"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 2. Message Category Sidebar */}
      <div
        className={`w-full lg:w-[320px] bg-white lg:rounded-[12px] flex-col p-4 lg:border lg:border-slate-200 shrink-0 lg:flex ${activeRoom || activeDmUser ? "hidden" : "flex"}`}
      >
        {/* Mobile Header in Pane 2 */}
        <div className="lg:hidden flex items-center gap-3 mb-6 mt-2">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 hover:bg-slate-100 rounded-[12px]"
          >
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          <h2 className="text-xl font-bold text-slate-900">Chats</h2>
        </div>

        {/* Search */}
        <div className="relative mb-6 lg:mt-2">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={async (e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length > 1) {
                try {
                  const data = await authFetch(
                    `/api/users/search?q=${e.target.value}`,
                  );
                  setSearchResults(data);
                } catch (err) {
                  console.error(err);
                }
              } else {
                setSearchResults([]);
              }
            }}
            className="w-full bg-white border border-slate-200 rounded-[12px] py-2.5 pl-11 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button className="flex-1 py-2 flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-[12px] text-sm font-semibold text-slate-900">
            <User className="w-4 h-4" /> Inbox
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              24
            </span>
          </button>
          <button className="flex-1 py-2 flex items-center justify-center gap-2 hover:bg-slate-50 border border-transparent rounded-[12px] text-sm font-semibold text-slate-500 transition-colors">
            <LayoutGrid className="w-4 h-4" /> Explore
            <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-full">
              10
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6">
          {searchQuery ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600">
                  Search Results
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-2">
                    No users found.
                  </p>
                ) : (
                  searchResults.map((resultUser) => (
                    <div
                      key={resultUser._id}
                      className="flex items-center justify-between p-3 rounded-[12px] bg-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-[12px] flex items-center justify-center bg-gradient-to-br ${getAvatarGradient(resultUser.username)} text-slate-900 font-semibold shadow-inner text-xs`}
                        >
                          {resultUser.username.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-slate-900">
                          {resultUser.username}
                        </p>
                      </div>
                      {friendsList.includes(resultUser.username) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-blue-600">Friend</span>
                          <button
                            onClick={() => {
                              setActiveDmUser(resultUser.username);
                              setActiveRoom(null);
                              setIsSettingsView(false);
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-[12px] font-semibold transition-colors"
                          >
                            Message
                          </button>
                        </div>
                      ) : resultUser.username === user.username ? (
                        <span className="text-xs text-slate-400">You</span>
                      ) : sentRequests.includes(resultUser.username) ? (
                        <span className="text-xs text-slate-400 font-semibold px-2 py-1">
                          Pending
                        </span>
                      ) : friendRequests.includes(resultUser.username) ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const res = await authFetch(
                                  "/api/users/friend/accept",
                                  {
                                    method: "POST",
                                    body: JSON.stringify({
                                      username: resultUser.username,
                                    }),
                                  },
                                );
                                setFriendsList(res);
                                setFriendRequests((prev) =>
                                  prev.filter((u) => u !== resultUser.username),
                                );
                                toast.success(
                                  `Accepted ${resultUser.username}'s friend request!`,
                                );
                              } catch (e) {
                                toast.error("Failed to accept");
                              }
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-[12px] font-semibold transition-colors"
                          >
                            Accept
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await authFetch("/api/users/friend/request", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    username: resultUser.username,
                                  }),
                                });
                                setSentRequests((prev) => [
                                  ...prev,
                                  resultUser.username,
                                ]);
                                toast.success(
                                  `Request sent to ${resultUser.username}!`,
                                );
                              } catch (e) {
                                toast.error(
                                  "Failed to send request. Already sent?",
                                );
                              }
                            }}
                            className="text-xs bg-white/10 hover:bg-white/20 text-slate-900 px-2 py-1 rounded-[12px] font-semibold transition-colors"
                          >
                            Send Request
                          </button>
                          <button
                            onClick={() => {
                              setActiveDmUser(resultUser.username);
                              setActiveRoom(null);
                              setIsSettingsView(false);
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-[12px] font-semibold transition-colors"
                          >
                            Message
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Messages Section */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  Messages
                </h3>

                {!user?.isGuest && (
                  <button
                    onClick={() => setIsCreatingRoom(!isCreatingRoom)}
                    className="w-full py-2.5 mb-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[12px] transition-colors text-sm"
                  >
                    Create New Group
                  </button>
                )}

                {isCreatingRoom && (
                  <form onSubmit={handleCreateRoom} className="mb-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="Channel name..."
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-[12px] bg-slate-100 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-blue-600 rounded-[12px] text-xs text-white font-semibold hover:bg-blue-700"
                    >
                      Create
                    </button>
                  </form>
                )}

                <div className="flex flex-col gap-2">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => {
                        setActiveRoom(room.id);
                        setActiveDmUser(null);
                        setIsSettingsView(false);
                      }}
                      className={`flex items-center justify-between p-2 rounded-[12px] transition-all ${activeRoom === room.id && !isSettingsView ? "bg-slate-50" : "hover:bg-slate-50"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${getAvatarGradient(room.id)} shrink-0`}
                        >
                          <Hash className="w-5 h-5 text-white/80" />
                        </div>
                        <div className="text-left w-full">
                          <div className="flex justify-between items-center w-full">
                            <p
                              className={`text-sm font-semibold ${activeRoom === room.id && !isSettingsView ? "text-slate-900" : "text-slate-700"}`}
                            >
                              {room.name}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              Just Now
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">
                            {room.members?.length || 0} Members in this group...
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Friend Requests Section */}
              {friendRequests.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-600">
                      Friend Requests
                    </h3>
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-[12px] font-bold">
                      {friendRequests.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {friendRequests.map((reqUser) => (
                      <div
                        key={reqUser}
                        className="flex items-center justify-between p-3 rounded-[12px] bg-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-[12px] flex items-center justify-center bg-gradient-to-br ${getAvatarGradient(reqUser)} text-slate-900 font-semibold shadow-inner text-xs`}
                          >
                            {reqUser.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-slate-900">
                            {reqUser}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={async () => {
                              try {
                                const data = await authFetch(
                                  "/api/users/friend/accept",
                                  {
                                    method: "POST",
                                    body: JSON.stringify({ username: reqUser }),
                                  },
                                );
                                setFriendsList(data);
                                setFriendRequests((prev) =>
                                  prev.filter((u) => u !== reqUser),
                                );
                                toast.success(
                                  `Accepted request from ${reqUser}`,
                                );
                              } catch (e) {
                                toast.error("Failed to accept");
                              }
                            }}
                            className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded-[12px] font-semibold hover:bg-blue-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const data = await authFetch(
                                  "/api/users/friend/reject",
                                  {
                                    method: "POST",
                                    body: JSON.stringify({ username: reqUser }),
                                  },
                                );
                                setFriendRequests(data);
                              } catch (e) {
                                toast.error("Failed to reject");
                              }
                            }}
                            className="text-[10px] bg-red-500/20 text-red-500 px-2 py-1 rounded-[12px] font-semibold hover:bg-red-500/30"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Messages Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-600">
                    Direct Message
                  </h3>
                  <button className="text-xs text-slate-400 flex items-center gap-1 hover:text-slate-900">
                    Newest <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {friendsList.length === 0 && (
                    <p className="text-xs text-slate-400 italic px-2">
                      No friends added yet
                    </p>
                  )}
                  {friendsList.map((friendUser) => {
                    const isOnline = onlineUsers.includes(friendUser);
                    return (
                      <div
                        key={friendUser}
                        className={`flex flex-col rounded-[12px] transition-all ${activeDmUser === friendUser && !isSettingsView ? "bg-slate-50" : "hover:bg-slate-50"}`}
                      >
                        <button
                          onClick={() => {
                            setActiveDmUser(friendUser);
                            setActiveRoom(null);
                            setIsSettingsView(false);
                          }}
                          className="flex items-center gap-3 p-2 w-full"
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${getAvatarGradient(friendUser)} text-white font-semibold relative shrink-0`}
                          >
                            {friendUser.charAt(0).toUpperCase()}
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-600 border-2 border-white rounded-full" />
                            )}
                          </div>
                          <div className="text-left w-full flex-1 min-w-0">
                            <div className="flex justify-between items-center w-full">
                              <p
                                className={`text-sm font-semibold truncate ${activeDmUser === friendUser && !isSettingsView ? "text-slate-900" : "text-slate-700"}`}
                              >
                                {friendUser}
                              </p>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                1 min
                              </span>
                            </div>
                            <div className="flex justify-between items-center w-full">
                              <p className="text-xs text-slate-500 truncate max-w-[150px]">
                                {isOnline ? "Online right now..." : "Offline"}
                              </p>
                              {activeDmUser === friendUser && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const res = await authFetch(
                                        "/api/users/friend/remove",
                                        {
                                          method: "POST",
                                          body: JSON.stringify({
                                            username: friendUser,
                                          }),
                                        },
                                      );
                                      setFriendsList(res);
                                      if (activeDmUser === friendUser)
                                        setActiveDmUser(null);
                                      toast.success(
                                        `Removed ${friendUser} from friends`,
                                      );
                                    } catch (err) {
                                      toast.error("Failed to remove friend");
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-600 z-10"
                                  title="Remove Friend"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Main Chat Area */}
      <div
        className={`flex-1 bg-white lg:rounded-[12px] flex-col relative lg:border lg:border-slate-200 min-w-0 lg:flex ${activeRoom || activeDmUser || isSettingsView ? "flex" : "hidden"}`}
      >
        {isSettingsView ? (
          <div className="flex-1 overflow-y-auto p-10 flex flex-col items-center">
            <button
              className="lg:hidden mb-4 self-start flex items-center text-slate-500 hover:text-slate-900"
              onClick={() => setIsSettingsView(false)}
            >
              <ArrowLeft className="w-5 h-5 mr-1" /> Back
            </button>
            <h2 className="text-3xl font-bold text-slate-900 mb-10 w-full max-w-2xl text-left border-b border-slate-200 pb-4">
              Account Settings
            </h2>

            <div className="w-full max-w-2xl space-y-8">
              {/* Profile Image Section */}
              <div className="bg-slate-100 p-6 rounded-[12px] border border-slate-200 flex items-center gap-6">
                <div
                  className={`w-24 h-24 rounded-[12px] flex items-center justify-center bg-gradient-to-br ${getAvatarGradient(user.username)} text-3xl font-bold text-slate-900 relative group cursor-pointer overflow-hidden shadow-xl`}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-semibold">Upload</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {user.username}
                  </h3>
                  <p className="text-slate-500 text-sm mb-3">
                    Update your profile picture
                  </p>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-900 rounded-[12px] text-sm transition-colors disabled:opacity-50"
                    disabled={isUploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {isUploadingAvatar ? "Uploading..." : "Choose Image"}
                  </button>
                </div>
              </div>

              {/* Password Section */}
              <div className="bg-slate-100 p-6 rounded-[12px] border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  Change Password
                </h3>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-[12px] px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-[12px] px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={user?.isGuest}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-[12px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Password
                  </button>
                </form>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-500/10 p-6 rounded-[12px] border border-red-500/20">
                <h3 className="text-lg font-bold text-red-400 mb-2">
                  Danger Zone
                </h3>
                <p className="text-sm text-red-200/70 mb-4">
                  Once you delete your account, there is no going back. Please
                  be certain.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={user?.isGuest}
                  className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-[12px] transition-colors border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-[72px] md:h-[88px] px-3 md:px-8 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center gap-2 md:gap-4">
                <button
                  className="lg:hidden w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-[12px] hover:bg-slate-100 transition-colors"
                  onClick={() => {
                    setActiveRoom(null);
                    setActiveDmUser(null);
                  }}
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-[12px] flex items-center justify-center bg-gradient-to-br ${getAvatarGradient(activeTitle)} text-base md:text-lg font-bold text-slate-900 relative`}
                >
                  {activeTitle.charAt(0).toUpperCase()}
                  {!activeRoom && (
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-blue-600 border-2 border-slate-300 rounded-[12px]" />
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-lg text-slate-900">
                    {activeTitle}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {activeRoom ? (
                      <span className="text-blue-600">{`${rooms.find((r) => r.id === activeRoom)?.members?.length || 0} Members`}</span>
                    ) : typingStatus === activeDmUser ? (
                      <span className="italic text-blue-600">typing...</span>
                    ) : onlineUsers.includes(activeDmUser) ? (
                      <span className="text-blue-600 font-medium">Online</span>
                    ) : activeDmUserProfile?.lastSeen ? (
                      `Last seen ${formatLastSeen(activeDmUserProfile.lastSeen)}`
                    ) : (
                      "Offline"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {activeRoom &&
                  rooms
                    .find((r) => r.id === activeRoom)
                    ?.members?.includes(user?.username) &&
                  activeRoom !== "general" && (
                    <button
                      onClick={handleLeaveRoom}
                      className="text-xs font-semibold px-2 py-2 md:px-4 bg-slate-100 hover:bg-slate-200 rounded-[12px] transition-colors text-slate-900 flex items-center gap-1.5"
                      title="Leave Channel"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden md:inline">Leave Channel</span>
                    </button>
                  )}

                {/* WebRTC Video/Phone triggers */}
                {activeDmUser && (
                  <>
                    <button
                      onClick={() => initiateCall(activeDmUser, "audio")}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-[12px] bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                    >
                      <Phone className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                    </button>
                    <button
                      onClick={() => initiateCall(activeDmUser, "video")}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-[12px] bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                    >
                      <Video className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => toast("More options opened")}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-[12px] bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <MoreVertical className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Lock Screen for unjoined channels */}
            {activeRoom &&
              !rooms
                .find((r) => r.id === activeRoom)
                ?.members?.includes(user?.username) &&
              activeRoom !== "general" ? (
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-[12px] bg-slate-100 flex items-center justify-center mb-6">
                  <Lock className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  Private Channel
                </h3>
                <p className="text-slate-500 mb-8 max-w-sm">
                  You are not a member of #
                  {rooms.find((r) => r.id === activeRoom)?.name}. Join the
                  channel to participate.
                </p>
                {user?.isGuest ? (
                  <button
                    disabled
                    className="px-8 py-3.5 rounded-[12px] bg-slate-100 text-slate-400 cursor-not-allowed font-semibold"
                  >
                    Log in to join
                  </button>
                ) : (
                  <button
                    onClick={handleJoinRoom}
                    className="px-8 py-3.5 rounded-[12px] bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.15)] flex items-center gap-2"
                  >
                    <LogIn className="w-5 h-5" />
                    Join Channel
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Messages Area */}
                <div className="flex-1 p-4 md:p-8 overflow-y-auto no-scrollbar space-y-6 flex flex-col bg-white">
                  <div className="text-center my-4 flex items-center justify-center gap-4">
                    <div className="h-px bg-slate-200 flex-1 max-w-[100px]"></div>
                    <span className="text-xs font-medium text-slate-400">
                      Today
                    </span>
                    <div className="h-px bg-slate-200 flex-1 max-w-[100px]"></div>
                  </div>

                  {messages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-full">
                      <p>No messages here yet.</p>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const isMe =
                      msg.user === user.username || msg.from === user.username;
                    const sender = msg.user || msg.from;

                    if (blockedUsers.includes(sender)) return null;

                    return (
                      <div
                        key={msg.id}
                        className={`flex max-w-[85%] md:max-w-[70%] gap-2 md:gap-3 group relative ${isMe ? "ml-auto flex-row-reverse" : "mr-auto flex-row"}`}
                      >
                        {!isMe && (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${getAvatarGradient(sender)} text-white text-xs font-semibold shrink-0 mt-auto`}
                          >
                            {sender.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`px-4 py-3 rounded-[12px] text-[14px] ${isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-700 rounded-bl-sm"}`}
                          >
                            {!isMe && activeRoom && (
                              <p className="text-xs font-bold text-slate-500 mb-1">
                                {sender}
                              </p>
                            )}
                            {msg.replyTo && (
                              <div className={`p-2 mb-2 rounded-[8px] text-xs border-l-4 ${isMe ? "bg-blue-700/50 border-white/60 text-white/90" : "bg-slate-200/60 border-blue-500 text-slate-600"} line-clamp-2`}>
                                <span className="font-bold block text-[11px] mb-0.5">{msg.replyTo.user}</span>
                                {msg.replyTo.text}
                              </div>
                            )}
                            {msg.fileUrl &&
                              (msg.fileUrl.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                                <video
                                  src={msg.fileUrl}
                                  controls
                                  className="max-w-[200px] rounded-[12px] mb-2"
                                />
                              ) : msg.fileUrl.match(
                                /\.(jpg|jpeg|png|gif|webp|svg)$/i,
                              ) ? (
                                <img
                                  src={msg.fileUrl}
                                  alt="Uploaded content"
                                  className="max-w-[200px] rounded-[12px] mb-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md"
                                  onClick={() => setActiveLightboxMsg(msg)}
                                />
                              ) : (
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 bg-slate-50 p-3 rounded-[12px] border border-slate-200 mb-2 hover:bg-slate-100 transition-colors"
                                >
                                  <span className="text-xs font-semibold text-blue-600">
                                    📎 View File
                                  </span>
                                </a>
                              ))}
                            {msg.text && (
                              <p className="leading-relaxed break-words">{msg.text}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 mt-1.5 px-1">
                            <span className="text-[11px] text-slate-400">
                              {formatTime(msg.timestamp)}
                            </span>
                            {isMe && !activeRoom && !msg.isDeleted && (
                              <span className="ml-1 shrink-0">
                                {msg.status === "read" ? (
                                  <div className="flex -space-x-1">
                                    <span className="text-blue-500 text-xs font-bold">✓</span>
                                    <span className="text-blue-500 text-xs font-bold">✓</span>
                                  </div>
                                ) : msg.status === "delivered" ? (
                                  <div className="flex -space-x-1">
                                    <span className="text-slate-400 text-xs">✓</span>
                                    <span className="text-slate-400 text-xs">✓</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs">✓</span>
                                )}
                              </span>
                            )}
                            {isMe && activeRoom && !msg.isDeleted && (
                              <span className="ml-1 text-slate-400 text-xs shrink-0">✓</span>
                            )}
                            {msg.isEdited && !msg.isDeleted && (
                              <span className="text-[10px] text-slate-400 italic ml-1.5">(edited)</span>
                            )}
                          </div>
                        </div>

                        {/* Hover Actions Menu */}
                        {!msg.isDeleted && (
                          <div className={`hidden group-hover:flex items-center gap-1.5 absolute top-1/2 -translate-y-1/2 ${isMe ? "right-full mr-2" : "left-full ml-2"} bg-white border border-slate-200 shadow-md rounded-[12px] p-1.5 z-10`}>
                            <button
                              onClick={() => setReplyToMessage({ id: msg.id || msg._id, text: msg.text, user: sender })}
                              className="text-xs hover:bg-slate-100 p-1 rounded-[8px] text-slate-500 font-semibold transition-colors"
                              title="Reply"
                            >
                              ↩
                            </button>
                            {isMe && (
                              <>
                                <button
                                  onClick={() => handleStartEdit(msg)}
                                  className="text-xs hover:bg-slate-100 p-1 rounded-[8px] text-slate-500 font-semibold transition-colors"
                                  title="Edit"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id || msg._id)}
                                  className="text-xs hover:bg-red-50 hover:text-red-500 p-1 rounded-[8px] text-slate-500 font-semibold transition-colors"
                                  title="Delete"
                                >
                                  🗑
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} className="h-2" />
                  {/* Snapchat style typing indicator */}
                  {typingStatus && (
                    <div className="flex max-w-[70%] flex-col mr-auto items-start animate-in fade-in duration-300">
                      <div className="px-5 py-3.5 rounded-[12px] bg-slate-100 text-slate-700 rounded-bl-sm border border-slate-200 flex items-center gap-1.5 h-[48px]">
                        <span
                          className="w-1.5 h-1.5 rounded-[12px] bg-gray-400 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-[12px] bg-gray-400 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-[12px] bg-gray-400 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-3 md:p-6 bg-white shrink-0 border-t border-slate-100 relative">
                  {showEmojiPicker && (
                    <div className="absolute bottom-[100px] left-6 z-50 shadow-2xl rounded-[12px]">
                      <EmojiPicker
                        onEmojiClick={(emojiObject) => {
                          setNewMessage((prev) => prev + emojiObject.emoji);
                        }}
                      />
                    </div>
                  )}
                  {selectedFile && (
                    <div className="mb-2 p-2 bg-slate-50 rounded-[12px] border border-slate-200 flex items-center justify-between max-w-sm">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-slate-500" />
                        <span className="text-xs text-slate-600 truncate max-w-[200px]">
                          {selectedFile.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-slate-400 hover:text-slate-900"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Reply Preview Bar */}
                  {replyToMessage && (
                    <div className="mb-2 p-2.5 bg-slate-50 border-l-4 border-blue-500 rounded-[12px] flex items-center justify-between">
                      <div className="text-xs text-left">
                        <span className="font-bold text-blue-600 block">Reply to {replyToMessage.user}</span>
                        <span className="text-slate-500 line-clamp-1">{replyToMessage.text}</span>
                      </div>
                      <button
                        onClick={() => setReplyToMessage(null)}
                        className="text-slate-400 hover:text-slate-900 ml-4 shrink-0 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Edit Preview Bar */}
                  {editingMessage && (
                    <div className="mb-2 p-2.5 bg-slate-50 border-l-4 border-amber-500 rounded-[12px] flex items-center justify-between">
                      <div className="text-xs text-left">
                        <span className="font-bold text-amber-600 block">Editing Message</span>
                        <span className="text-slate-500 line-clamp-1">{editingMessage.text}</span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingMessage(null);
                          setNewMessage("");
                        }}
                        className="text-slate-400 hover:text-slate-900 ml-4 shrink-0 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setShowEmojiPicker(false);
                      handleSendMessage(e);
                    }}
                    className="flex gap-1 md:gap-2 items-center border border-slate-200 rounded-[12px] p-1.5 md:p-2 pr-1.5 md:pr-2 transition-colors focus-within:border-blue-600"
                  >
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-[12px] hover:bg-slate-100 transition-colors ${showEmojiPicker ? "bg-slate-100" : ""}`}
                      title="Emojis"
                    >
                      <Smile className="w-5 h-5 text-slate-500" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      accept="image/*,video/*"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-[12px] hover:bg-slate-100 transition-colors"
                      title="Attach File"
                    >
                      <Plus className="w-5 h-5 text-slate-500" />
                    </button>
                    <input
                      type="text"
                      placeholder={
                        user?.isGuest
                          ? "Log in to send messages..."
                          : "Type a message..."
                      }
                      value={newMessage}
                      onChange={handleInputChange}
                      disabled={user?.isGuest || isUploading}
                      className="flex-1 min-w-0 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-[15px] px-2 md:px-4"
                    />
                    <button
                      type="submit"
                      disabled={user?.isGuest || isUploading}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send Message"
                    >
                      {isUploading ? (
                        <span className="text-[10px]">...</span>
                      ) : (
                        <Send className="w-4 h-4 fill-white -translate-x-[1px] translate-y-[1px]" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* 4. Right User Profile Pane */}
      {!isSettingsView && (
        <div className="w-[320px] bg-white flex flex-col p-6 border-l border-slate-200 shrink-0 hidden xl:flex overflow-y-auto no-scrollbar">
          <h3 className="font-bold text-slate-900 mb-8 text-[15px]">
            Group Information
          </h3>

          <div className="flex flex-col items-center mb-8">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br ${getAvatarGradient(activeTitle)} text-3xl font-bold text-white shadow-sm mb-4 relative`}
            >
              {activeTitle.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-slate-900">{activeTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">
              {activeRoom
                ? `${rooms.find((r) => r.id === activeRoom)?.members?.length || 0} members`
                : "Online"}
            </p>
          </div>

          <div className="flex items-center justify-between px-2 mb-8 text-center">
            <div className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 group">
              <div className="w-12 h-12 rounded-[12px] bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Notification
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 group">
              <div className="w-12 h-12 rounded-[12px] bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-slate-100 transition-colors">
                <Flag className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Pin Group
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 group">
              <div className="w-12 h-12 rounded-[12px] bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-slate-100 transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Member
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 group">
              <div className="w-12 h-12 rounded-[12px] bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-slate-100 transition-colors">
                <Settings className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Setting
              </span>
            </div>
          </div>

          {/* Members List */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900">Members</h4>
              <button className="text-xs text-blue-600 font-semibold hover:underline">
                View All
              </button>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <User className="w-3 h-3" />
              {activeRoom
                ? `${rooms.find((r) => r.id === activeRoom)?.members?.length || 0} members`
                : "2 members"}
            </p>
          </div>

          <hr className="border-slate-100 mb-6" />

          {/* Images */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-900">Images</h4>
              <button className="text-xs text-blue-600 font-semibold hover:underline">
                View All
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="aspect-square bg-blue-100 rounded-[12px]"></div>
              <div className="aspect-square bg-orange-100 rounded-[12px]"></div>
              <div className="aspect-square bg-indigo-100 rounded-[12px]"></div>
              <div className="aspect-square bg-green-100 rounded-[12px]"></div>
              <div className="aspect-square bg-purple-100 rounded-[12px]"></div>
              <div className="aspect-square bg-pink-100 rounded-[12px]"></div>
              <div className="aspect-square bg-teal-100 rounded-[12px]"></div>
              <div className="aspect-square bg-slate-100 rounded-[12px]"></div>
            </div>
          </div>

          <hr className="border-slate-100 mb-6" />

          {/* Files */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-900">Files</h4>
              <button className="text-xs text-blue-600 font-semibold hover:underline">
                View All
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    PDF
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Presentation.pdf
                    </p>
                    <p className="text-[10px] text-slate-400">3.5MB</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">12 Nov</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    DOC
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Campaign_Brief.docx
                    </p>
                    <p className="text-[10px] text-slate-400">2.2MB</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">12 Nov</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp-like Lightbox Modal for Images */}
      {activeLightboxMsg && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
          onClick={() => setActiveLightboxMsg(null)}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-slate-900/50 border-b border-slate-800/50 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3 text-white">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${getAvatarGradient(
                  activeLightboxMsg.user || activeLightboxMsg.from
                )} text-white font-bold`}
              >
                {(activeLightboxMsg.user || activeLightboxMsg.from).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {activeLightboxMsg.user || activeLightboxMsg.from}
                </p>
                <p className="text-[11px] text-slate-400">
                  {formatTime(activeLightboxMsg.timestamp)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activeLightboxMsg.fileUrl}
                download
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title="Download Image"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                onClick={() => setActiveLightboxMsg(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div
            className="flex-1 flex items-center justify-center p-4 relative"
            onClick={() => setActiveLightboxMsg(null)}
          >
            <img
              src={activeLightboxMsg.fileUrl}
              alt="Preview"
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-transform duration-300 animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
