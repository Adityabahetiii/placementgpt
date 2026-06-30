import { useState } from "react";

export default function ChatInput({ onSend }) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;

    onSend(message);
    setMessage("");
  };

  return (
    <div className="p-4 border-t border-slate-800 flex gap-3">

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask a placement question..."
        className="flex-1 bg-slate-800 p-4 rounded-xl outline-none"
      />

      <button
        onClick={handleSend}
        className="bg-blue-600 px-6 rounded-xl"
      >
        Send
      </button>

    </div>
  );
}