export default function ChatMessage({ msg }) {
  if (msg.system) {
    return <div className="chat-msg system">{msg.text}</div>;
  }
  return (
    <div className="chat-msg">
      <span className="cm-name" style={{ color: msg.color }}>{msg.name}: </span>
      <span className="cm-text">{msg.message}</span>
    </div>
  );
}
