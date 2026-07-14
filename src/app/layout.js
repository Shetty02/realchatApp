import "./globals.css";
import Header from "@/components/Header";
import { SocketProvider } from "@/context/SocketContext";

import { Toaster } from "react-hot-toast";

import { CallProvider } from "@/context/CallContext";
import CallModal from "@/components/CallModal";

export const metadata = {
  title: "Real-Time Stream & Chat Portal",
  description:
    "Next-gen real-time chat, notification, live stream, and camera stream platform.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-slate-50 text-slate-900" suppressHydrationWarning>
        <SocketProvider>
          <CallProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "#ffffff",
                  color: "#0f172a",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                },
              }}
            />
            <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-slate-50 text-slate-900 relative selection:bg-blue-200 selection:text-blue-900">
              <main className="flex-1 w-full h-full relative z-10 overflow-hidden">
                {children}
                <CallModal />
              </main>
            </div>
          </CallProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
