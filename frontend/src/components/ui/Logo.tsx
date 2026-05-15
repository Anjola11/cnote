import { useTheme } from '../../hooks/useTheme';
import logoLight from '../../assets/logo.svg';
import logoDark from '../../assets/logo-dark.svg';

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  const { isDark } = useTheme();
  const logoSrc = isDark ? logoDark : logoLight;

  return <img src={logoSrc} alt="cnote" className={className} />;
}
