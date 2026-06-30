export default function ChatMessage({ text, sender }) {
  return (
    <div
      className={`max-w-2xl p-4 rounded-xl ${
        sender === "user"
          ? "bg-blue-600 ml-auto"
          : "bg-slate-800"
      }`}
    >
      {text}
    </div>
  );
}