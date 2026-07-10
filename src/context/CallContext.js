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

    return () => {
      socket.off("incoming_call");
      socket.off("call_answered");
      socket.off("ice_candidate");
      socket.off("call_ended");
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
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
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
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
