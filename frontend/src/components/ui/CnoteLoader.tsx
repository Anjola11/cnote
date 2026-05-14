import Logo from './Logo';
import './CnoteLoader.css';

interface CnoteLoaderProps {
  message?: string;
}

interface CnoteLoaderProps {}

export default function CnoteLoader(_props: CnoteLoaderProps) {
  return (
    <div className="cnote-loader">
      <div className="cnote-loader__content">
        <Logo className="cnote-loader__logo logo-breathe" />
      </div>
    </div>
  );
}
