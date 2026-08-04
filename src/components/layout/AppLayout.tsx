import { ReactNode } from 'react';

import { AppTopChrome } from './AppTopChrome';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  /** Optional control(s) rendered in top chrome immediately before the Search icon. */
  topChromeBeforeSearch?: ReactNode;
}

export function AppLayout({ children, hideNav = false, topChromeBeforeSearch }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppTopChrome beforeSearch={topChromeBeforeSearch} />
      <main data-build-root="true" className={`${hideNav ? '' : 'pb-20'}`}>
        {children}
      </main>
      {!hideNav && <MobileNav />}
    </div>
  );
}
