"use client";

import React, { useEffect, useRef } from "react";
import { useCall } from "@/context/CallContext";
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff } from "lucide-react";

export default function CallModal() {
  const {
    callStatus,
    callType,
    incomingCall,
    activeCallUser,
    localStream,
    remoteStream,
    answerCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus]);

  if (callStatus === "idle") return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-white/80 backdrop-blur-md">
      {/* INCOMING CALL */}
      {callStatus === "ringing" && incomingCall && (
        <div className="bg-white rounded-[12px] p-8 max-w-md w-full mx-4 shadow-xl shadow-slate-900/10 text-center border border-slate-200 animate-in zoom-in-95 fade-in duration-300">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 mx-auto flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-blue-500/30">
            <span className="text-3xl font-bold text-white">
              {incomingCall.from.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {incomingCall.from}
          </h2>
          <p className="text-blue-500 mb-8 font-medium tracking-wide">
            Incoming {incomingCall.callType === "video" ? "Video" : "Audio"} Call...
          </p>

          <div className="flex justify-center gap-6">
            <button
              onClick={rejectCall}
              className="w-14 h-14 rounded-[12px] bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-all hover:scale-105"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              onClick={answerCall}
              className="w-14 h-14 rounded-[12px] bg-green-500 text-white flex items-center justify-center transition-all hover:scale-105 hover:bg-green-400 shadow-lg shadow-green-500/30 animate-bounce"
            >
              {incomingCall.callType === "video" ? (
                <Video className="w-6 h-6" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* OUTGOING CALL */}
      {callStatus === "calling" && (
        <div className="bg-white rounded-[12px] p-8 max-w-md w-full mx-4 shadow-xl shadow-slate-900/10 text-center border border-slate-200 animate-in zoom-in-95 fade-in duration-300">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 mx-auto flex items-center justify-center mb-6 relative">
            <span className="text-3xl font-bold text-slate-700">
              {activeCallUser?.charAt(0).toUpperCase()}
            </span>
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {activeCallUser}
          </h2>
          <p className="text-slate-500 mb-8 font-medium tracking-wide">
            Calling...
          </p>

          <div className="flex justify-center">
            <button
              onClick={endCall}
              className="w-14 h-14 rounded-[12px] bg-red-500 text-white flex items-center justify-center transition-all hover:scale-105 hover:bg-red-400 shadow-lg shadow-red-500/30"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE CALL */}
      {callStatus === "connected" && (
        <div className="relative w-full max-w-4xl h-[80vh] bg-slate-900 rounded-[12px] overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-300">
          
          {/* Header */}
          <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-20 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="font-bold text-white">
                  {activeCallUser?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-white font-semibold">{activeCallUser}</h3>
                <span className="text-green-400 text-xs font-medium px-2 py-0.5 rounded-[12px] bg-green-400/10 border border-green-400/20">
                  Secured
                </span>
              </div>
            </div>
          </div>

          {/* Video Area */}
          <div className="flex-1 relative w-full h-full bg-black flex items-center justify-center">
            {callType === "video" ? (
              <>
                {/* Remote Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Local Video (PiP) */}
                <div className="absolute bottom-24 right-6 w-32 md:w-48 aspect-[3/4] bg-slate-900 rounded-[12px] overflow-hidden shadow-2xl border-2 border-white/20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                </div>
              </>
            ) : (
              /* Audio Only View */
              <div className="flex flex-col items-center justify-center">
                <div className="w-32 h-32 rounded-[12px] bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/50 mb-6">
                  <span className="text-5xl font-bold text-white">
                    {activeCallUser?.charAt(0).toUpperCase()}
                  </span>
                </div>
                {/* Hidden Audio Elements */}
                <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="absolute bottom-6 inset-x-0 flex justify-center items-center gap-4 z-20">
            <button
              onClick={toggleMic}
              className="w-12 h-12 rounded-[12px] bg-slate-800/80 backdrop-blur hover:bg-slate-700 text-white flex items-center justify-center transition-colors border border-white/10"
            >
              <Mic className="w-5 h-5" />
            </button>
            {callType === "video" && (
              <button
                onClick={toggleVideo}
                className="w-12 h-12 rounded-[12px] bg-slate-800/80 backdrop-blur hover:bg-slate-700 text-white flex items-center justify-center transition-colors border border-white/10"
              >
                <Video className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={endCall}
              className="w-14 h-14 rounded-[12px] bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/20 hover:scale-105 ml-2"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
