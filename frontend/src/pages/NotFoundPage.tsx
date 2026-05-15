import { Link } from 'react-router-dom';
import PublicNavbar from '../components/layout/PublicNavbar';
import Button from '../components/ui/Button';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <PublicNavbar />

      <main className="not-found-page__main">
        <div className="not-found-page__content">
          <h1 className="not-found-page__title">404</h1>
          <p className="not-found-page__subtitle">Page not found</p>
          <p className="not-found-page__text">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <div className="not-found-page__actions">
            <Link to="/feed">
              <Button variant="primary" size="lg">Go to Dashboard</Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="lg">Return Home</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
