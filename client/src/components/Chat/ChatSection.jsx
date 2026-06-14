import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';

export default function ChatSection({ messages, onSend }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="chat-section" id="chat-section">
      <div className="sidebar-section" style={{ flexShrink: 0 }}>
        <div className="sidebar-title">💬 <span>Chat</span></div>
      </div>

      <div className="chat-messages" id="chat-messages">
        {messages.map((msg, i) => (
          <ChatMessage key={i} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row" id="chat-input-row">
        <input
          className="chat-input"
          id="chat-input"
          type="text"
          placeholder="Say something..."
          maxLength={120}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          autoComplete="off"
        />
        <button className="chat-send" id="chat-send" onClick={handleSend}>➤</button>
      </div>
    </div>
  );
}
