"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSocket } from "@/context/SocketContext";
import {
  MessageSquare,
  Globe,
  Hash,
  Users,
  Zap,
  Bell,
  Shield,
  Sparkles,
} from "lucide-react";
import Header from "@/components/Header";

export default function Home() {
  const { socket } = useSocket();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;
    setIsConnected(socket.connected);
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  return (
    <div className="h-full overflow-auto">
      <Header />
      <div className="space-y-20 pb-20">
        {/* Hero Section */}
        <section className="relative text-center pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col items-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-100/50 blur-[120px] rounded-[12px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 backdrop-blur-sm mb-8 hover:bg-slate-200 transition-colors">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
            />
            {isConnected ? "System Online & Ready" : "Connecting to Server..."}
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6">
            Communicate with <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Lightning Speed
            </span>
          </h1>

          <p className="text-slate-500 text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
            Experience seamless, real-time conversations. Whether it's group
            discussions or private direct messages, our platform keeps you
            connected instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/chat"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-[12px] bg-blue-600 text-white font-bold text-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center gap-2">
                Start Chatting <MessageSquare className="w-5 h-5" />
              </span>
            </Link>
            <a
              href="#features"
              className="px-8 py-4 rounded-[12px] bg-slate-100 border border-slate-200 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
            >
              Explore Features
            </a>
          </div>
        </section>

        {/* Features Grid */}
        <section
          id="features"
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Everything you need for seamless chat
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Built on top of WebSockets for ultra-low latency, ensuring your
              messages are delivered the millisecond you hit send.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Hash className="w-6 h-6 text-purple-400" />}
              title="Group Channels"
              description="Create or join dedicated rooms for different topics, teams, or projects. Keep discussions organized."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6 text-pink-400" />}
              title="Direct Messaging"
              description="Take conversations private with secure, one-on-one direct messages with anyone online."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-yellow-400" />}
              title="Live Typing Indicators"
              description="See when others are typing in real-time. Never talk over each other again."
            />
            <FeatureCard
              icon={<Bell className="w-6 h-6 text-red-400" />}
              title="Instant Notifications"
              description="Stay in the loop with active alerts for new messages, mentions, and user presence."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-green-400" />}
              title="Secure & Private"
              description="Your direct messages are routed securely. Focus on the conversation without worries."
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6 text-blue-400" />}
              title="Modern Aesthetics"
              description="A beautiful, distraction-free interface built with glassmorphism and smooth animations."
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-4xl mx-auto px-4 py-16">
          <div className="glass-card rounded-[12px] p-10 text-center relative overflow-hidden border border-slate-200">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50" />
            <h2 className="text-3xl font-bold text-slate-900 mb-4 relative z-10">
              Ready to jump in?
            </h2>
            <p className="text-slate-600 mb-8 max-w-lg mx-auto relative z-10">
              Join the global chat room right now and experience the speed for
              yourself.
            </p>
            <Link
              href="/chat"
              className="relative z-10 inline-flex items-center gap-2 px-6 py-3 rounded-[12px] bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-lg shadow-blue-500/30"
            >
              Launch Chat App &rarr;
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="glass-card p-6 rounded-[12px] border border-slate-200 hover:border-blue-300 transition-all duration-300 group shadow-sm hover:shadow-md">
      <div className="w-12 h-12 rounded-[12px] bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
