import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const svgProps = {
  'aria-hidden': true,
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const TABS: { to: string; label: string; icon: ReactNode }[] = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <svg {...svgProps}>
        <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    to: '/presets',
    label: 'Presets',
    icon: (
      <svg {...svgProps}>
        <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
      </svg>
    ),
  },
  {
    to: '/progress',
    label: 'Progress',
    icon: (
      <svg {...svgProps}>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 6-6" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
];

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Tabs">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => (isActive ? 'active' : undefined)}
        >
          {t.icon}
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
