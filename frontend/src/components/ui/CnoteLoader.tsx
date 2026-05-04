import Logo from './Logo';
import './CnoteLoader.css';

interface CnoteLoaderProps {
  message?: string;
}

export default function CnoteLoader({ message = 'Loading...' }: CnoteLoaderProps) {
  return (
    <div className="cnote-loader">
      <div className="cnote-loader__content">
        <Logo className="cnote-loader__logo logo-breathe" />
        <span className="cnote-loader__message">{message}</span>
      </div>
    </div>
  );
}
