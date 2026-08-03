import { Link, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

import { InstitutionalDocumentPage } from '@/pages/institutional/InstitutionalDocumentPage';
import { getInstitutionalDocByPath } from '@/lib/institutional-docs';

/** Renders the institutional document that matches the current public route. */
export default function InstitutionalDocRoute() {
  const { pathname } = useLocation();
  const doc = getInstitutionalDocByPath(pathname);
  if (!doc) {
    return <Navigate to="/documents" replace />;
  }
  return <InstitutionalDocumentPage doc={doc} />;
}

/** Convenience re-export for typed links in the documents index. */
export function InstitutionalDocLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
