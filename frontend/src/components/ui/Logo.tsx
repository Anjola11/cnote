import { useTheme } from '../../hooks/useTheme';
import logoLight from '../../assets/logo.svg';
import logoDark from '../../assets/logo-dark.svg';

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? logoDark : logoLight;

  return <img src={logoSrc} alt="cnote" className={className} />;
}
