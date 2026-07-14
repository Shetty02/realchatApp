"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useSocket } from "./SocketContext";
import toast from "react-hot-toast";

const CallContext = createContext(null);

export const useCall = () => {
  return useContext(CallContext);
};

export const CallProvider = ({ children }) => {
  const { socket, user } = useSocket();

  const [callStatus, setCallStatus] = useState("idle"); // 'idle', 'ringing', 'calling', 'connected'
  const [callType, setCallType] = useState(null); // 'video' | 'audio'
  const [incomingCall, setIncomingCall] = useState(null); // { from, offer, callType }
  const [activeCallUser, setActiveCallUser] = useState(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isRemoteMicMuted, setIsRemoteMicMuted] = useState(false);
  const [isRemoteVideoMuted, setIsRemoteVideoMuted] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const peerConnection = useRef(null);
  const localStreamRef = useRef(null);

  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    if (!socket || !user) return;

    socket.on("incoming_call", async (data) => {
      // If already in a call, we could send a 'busy' signal. For now, just ignore or overwrite.
      if (callStatus !== "idle") {
        socket.emit("end_call", {
          to: data.from,
          from: user.username,
          reason: "busy",
        });
        return;
      }
      setIncomingCall(data);
      setCallStatus("ringing");
    });

    socket.on("call_answered", async (data) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.answer),
          );
          setCallStatus("connected");
        } catch (err) {
          console.error("Error setting remote description:", err);
        }
      }
    });

    socket.on("ice_candidate", async (data) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(data.candidate),
          );
        } catch (err) {
          console.error("Error adding ice candidate:", err);
        }
      }
    });

    socket.on("call_ended", () => {
      cleanupCall();
    });

    socket.on("call_state_change", (data) => {
      if (data.type === "mic") {
        setIsRemoteMicMuted(!data.enabled);
      } else if (data.type === "video") {
        setIsRemoteVideoMuted(!data.enabled);
      }
    });

    return () => {
      socket.off("incoming_call");
      socket.off("call_answered");
      socket.off("ice_candidate");
      socket.off("call_ended");
      socket.off("call_state_change");
    };
  }, [socket, user, callStatus]);

  const createFakeStream = (type) => {
    // Create a fake video track using a canvas
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    
    setInterval(() => {
      ctx.fillStyle = "#1b192c";
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = "#a855f7"; 
      ctx.font = "30px Arial";
      ctx.fillText("Simulated Media Stream", 150, 240);
      ctx.fillText(new Date().toLocaleTimeString(), 240, 290);
    }, 1000);

    const stream = canvas.captureStream(30);
    
    // Add a fake silent audio track
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    const osc = audioCtx.createOscillator();
    osc.connect(dest);
    stream.addTrack(dest.stream.getAudioTracks()[0]);
    
    // If audio-only, we remove the video track
    if (type !== 'video') {
      stream.getVideoTracks().forEach(t => stream.removeTrack(t));
    }
    
    return stream;
  };

  const getMedia = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error("Failed to get media", err);
      if (
        err.name === "NotFoundError" ||
        err.message.includes("Requested device not found") ||
        err.name === "NotAllowedError"
      ) {
        toast("No hardware found/allowed. Using simulated stream for testing.", { icon: "🎥" });
        const fakeStream = createFakeStream(type);
        setLocalStream(fakeStream);
        localStreamRef.current = fakeStream;
        return fakeStream;
      } else {
        toast.error("Failed to access media devices.");
        throw err;
      }
    }
  };

  const createPeerConnection = (targetUser) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice_candidate", {
          to: targetUser,
          from: user.username,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnection.current = pc;
    return pc;
  };

  const initiateCall = async (targetUser, type) => {
    try {
      setCallStatus("calling");
      setActiveCallUser(targetUser);
      setCallType(type);

      await getMedia(type);
      const pc = createPeerConnection(targetUser);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call_user", {
        to: targetUser,
        from: user.username,
        offer,
        callType: type,
      });
    } catch (err) {
      cleanupCall();
    }
  };

  const answerCall = async () => {
    if (!incomingCall) return;
    try {
      setCallStatus("connected");
      setActiveCallUser(incomingCall.from);
      setCallType(incomingCall.callType);

      await getMedia(incomingCall.callType);
      const pc = createPeerConnection(incomingCall.from);

      await pc.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer),
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer_call", {
        to: incomingCall.from,
        from: user.username,
        answer,
      });

      setIncomingCall(null);
    } catch (err) {
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      socket.emit("end_call", {
        to: incomingCall.from,
        from: user.username,
      });
      setIncomingCall(null);
      setCallStatus("idle");
    }
  };

  const endCall = () => {
    if (activeCallUser || incomingCall) {
      const targetUser = activeCallUser || (incomingCall && incomingCall.from);
      socket.emit("end_call", {
        to: targetUser,
        from: user.username,
      });
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus("idle");
    setIncomingCall(null);
    setActiveCallUser(null);
    setCallType(null);
    setIsMicMuted(false);
    setIsVideoMuted(false);
    setIsRemoteMicMuted(false);
    setIsRemoteVideoMuted(false);
    setFacingMode("user");
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const newEnabled = !audioTrack.enabled;
        audioTrack.enabled = newEnabled;
        setIsMicMuted(!newEnabled);

        if (activeCallUser) {
          socket.emit("call_state_change", {
            to: activeCallUser,
            from: user.username,
            type: "mic",
            enabled: newEnabled,
          });
        }
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const newEnabled = !videoTrack.enabled;
        videoTrack.enabled = newEnabled;
        setIsVideoMuted(!newEnabled);

        if (activeCallUser) {
          socket.emit("call_state_change", {
            to: activeCallUser,
            from: user.username,
            type: "video",
            enabled: newEnabled,
          });
        }
      }
    }
  };

  const switchCamera = async () => {
    if (callType !== "video" || !localStreamRef.current) return;
    
    try {
      const newFacingMode = facingMode === "user" ? "environment" : "user";
      setFacingMode(newFacingMode);
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;
      
      // Replace video track in peer connection
      if (peerConnection.current) {
        const senders = peerConnection.current.getSenders();
        const videoSender = senders.find(sender => sender.track && sender.track.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }
      
      // Replace video track in local stream ref
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
      }
      localStreamRef.current.addTrack(newVideoTrack);
      
      // Recreate localStream object to trigger state update
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      
      // Keep track of mute state
      if (isVideoMuted) {
        newVideoTrack.enabled = false;
      } else {
        if (activeCallUser) {
          socket.emit("call_state_change", {
            to: activeCallUser,
            from: user.username,
            type: "video",
            enabled: true,
          });
        }
      }
      
      toast.success(`Switched to ${newFacingMode === "user" ? "front" : "rear"} camera`);
    } catch (err) {
      console.error("Failed to switch camera", err);
      toast.error("Could not switch camera. Device might not have multiple cameras.");
    }
  };

  return (
    <CallContext.Provider
      value={{
        callStatus,
        callType,
        incomingCall,
        activeCallUser,
        localStream,
        remoteStream,
        initiateCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMic,
        toggleVideo,
        isMicMuted,
        isVideoMuted,
        isRemoteMicMuted,
        isRemoteVideoMuted,
        switchCamera,
        facingMode,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
