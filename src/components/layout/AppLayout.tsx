import { ReactNode } from 'react';

import { AppTopChrome } from './AppTopChrome';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppTopChrome />
      <main data-build-root="true" className={`${hideNav ? '' : 'pb-20'}`}>
        {children}
      </main>
      {!hideNav && <MobileNav />}
    </div>
  );
}
