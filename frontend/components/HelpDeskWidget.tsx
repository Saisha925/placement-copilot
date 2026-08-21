"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { askHelpDesk } from "@/lib/api";

type Message = {
  role: "user" | "bot";
  content: string;
};

export default function HelpDeskWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("helpdeskHistory");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    } else {
      setMessages([
        { role: "bot", content: "Hi! I'm the Copilot Help Desk. Need help navigating the app or have questions about a feature?" }
      ]);
    }
  }, []);

  // Save history to local storage when messages change
  useEffect(() => {
    localStorage.setItem("helpdeskHistory", JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Send history excluding the initial bot message if needed, but it's fine to include
      const historyForApi = newMessages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const res = await askHelpDesk(userMsg, pathname || "", historyForApi);
      setMessages([...newMessages, { role: "bot", content: res.answer }]);
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: "bot", content: "Sorry, I am having trouble connecting to the server. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-80 sm:w-96 flex flex-col h-[600px] max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-indigo-400" />
              Help Desk
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === "user" 
                    ? "bg-indigo-600 text-white rounded-br-none" 
                    : "bg-zinc-800 text-zinc-200 rounded-bl-none leading-relaxed"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-2xl rounded-bl-none px-4 py-2 text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-900">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask for help..."
                className="flex-1 bg-zinc-800 border-none rounded-full px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-zinc-500"
              />
              <button 
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-full transition-colors flex items-center justify-center h-9 w-9"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center mt-2">
              <button 
                onClick={() => {
                  setMessages([{ role: "bot", content: "Hi! I'm the Copilot Help Desk. Need help navigating the app or have questions about a feature?" }]);
                }}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear Conversation
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg shadow-indigo-900/20 transition-all hover:scale-105"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
