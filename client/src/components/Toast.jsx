export default function Toast({ toasts }) {
  return (
    <div className="toast-container" id="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type || 'system'}`}>
          <span className="toast-icon">{toast.icon}</span>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            {toast.body && <div className="toast-body">{toast.body}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
