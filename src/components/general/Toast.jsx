function notificationText(notification) {
  if (notification.type === "cafe_verified") {
    return `Your cafe "${notification.cafeName}" has been added and is now live!`;
  }

  if (notification.type === "cafe_rejected") {
    return `Your cafe "${notification.cafeName}" was rejected${
      notification.reason ? `: ${notification.reason}` : "."
    }`;
  }

  return null;
}

function Toast({ notifications, onDismiss }) {
  if (!notifications?.length) {
    return null;
  }

  return (
    <div className="toast-stack">
      {notifications.map((notification, index) => (
        <div className="toast" key={index}>
          <span>{notificationText(notification)}</span>
          <button type="button" onClick={() => onDismiss(index)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toast;
