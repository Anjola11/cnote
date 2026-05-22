import './OfflineBanner.css';

export default function OfflineBanner() {
  return (
    <div className="offline-banner">
      <div className="offline-banner__content">
        <i className="fa-solid fa-cloud-arrow-down offline-banner__icon" />
        <h3 className="offline-banner__title">You're offline</h3>
        <p className="offline-banner__message">
          Editing is paused until your connection returns.
          Your content is safe — we'll resume when you're back online.
        </p>
        <div className="offline-banner__dot" />
      </div>
    </div>
  );
}
