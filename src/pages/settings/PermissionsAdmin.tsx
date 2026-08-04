import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Loader2,
  X,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { APP_ROLES, type AppPermission, type AppRole } from '@/lib/access-control';
import { pageRegistry, type PageId, type SectionId } from '@/lib/feature-registry';
import { permissionMetadata, permissionMetadataMap } from '@/lib/permission-metadata';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const sectionOrder: SectionId[] = ['home', 'discovery', 'knowledge', 'identity', 'contribution', 'marketplace', 'preferences', 'administration'];
const pageOrder: PageId[] = ['home', 'messaging', 'study', 'features', 'law', 'profile', 'editProfile', 'endorse', 'market', 'settings', 'admin', 'adminRoles', 'adminUsers', 'adminPermissions'];
function getPageLabel(pageId: PageId, t: (key: string, params?: Record<string, string | number>) => string) {
  if (pageId === 'editProfile') return t('settings.editProfile');
  if (pageId === 'admin') return t('features.pages.admin');
  if (pageId === 'adminRoles') return t('settings.adminRoles');
  if (pageId === 'adminUsers') return t('common.users');
  if (pageId === 'adminPermissions') return t('common.permissions');
  return t(pageRegistry[pageId].labelKey);
}

export default function PermissionsAdmin() {
  const { t } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  /** Missing keys default to collapsed so groups open folded until clicked. */
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>({});
  const [rolePermissions, setRolePermissions] = useState<Record<AppRole, AppPermission[]>>(
    Object.fromEntries(APP_ROLES.map((role) => [role, []])) as Record<AppRole, AppPermission[]>,
  );
  const visibleRoles = useMemo(
    () => (profile?.role === 'admin' ? APP_ROLES.filter((role) => role !== 'founder') : APP_ROLES),
    [profile?.role],
  );
  const matrixGridTemplate = useMemo(
    () => `minmax(140px, 1.2fr) repeat(${visibleRoles.length}, minmax(64px, 1fr))`,
    [visibleRoles.length],
  );

  useEffect(() => {
    const loadMatrix = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('role_permissions').select('role,permission');

      if (error) {
        console.error('Error loading permission matrix:', error);
        toast.error(t('admin.permissions.loadFailed'));
        setLoading(false);
        return;
      }

      setRolePermissions(
        Object.fromEntries(
          APP_ROLES.map((role) => [
            role,
            (data ?? [])
              .filter((entry) => entry.role === role)
              .map((entry) => entry.permission),
          ]),
        ) as Record<AppRole, AppPermission[]>,
      );
      setLoading(false);
    };

    void loadMatrix();
    // Intentionally omit `t`: toast copy can use the latest render closure without reloading the matrix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedPermissions = useMemo(() => {
    return sectionOrder
      .map((sectionId) => {
        const pages = pageOrder
          .map((pageId) => {
            const items = permissionMetadata.filter(
              (entry) => entry.section === sectionId && entry.page === pageId,
            );

            if (!items.length) return null;

            return {
              pageId,
              items,
            };
          })
          .filter(Boolean) as Array<{ pageId: PageId; items: typeof permissionMetadata }>;

        if (!pages.length) return null;

        return {
          sectionId,
          pages,
        };
      })
      .filter(Boolean) as Array<{
        sectionId: SectionId;
        pages: Array<{ pageId: PageId; items: typeof permissionMetadata }>;
      }>;
  }, []);

  const nestedPageKeys = useMemo(() => {
    const keys: string[] = [];
    for (const sectionGroup of groupedPermissions) {
      const sectionLabel = t(`admin.permissions.sectionNames.${sectionGroup.sectionId}`);
      for (const pageGroup of sectionGroup.pages) {
        const pageLabel = getPageLabel(pageGroup.pageId, t);
        if (pageLabel.trim().toLowerCase() !== sectionLabel.trim().toLowerCase()) {
          keys.push(`${sectionGroup.sectionId}:${pageGroup.pageId}`);
        }
      }
    }
    return keys;
  }, [groupedPermissions, t]);

  const handleTogglePermission = async (role: AppRole, permission: AppPermission) => {
    if (role === 'system') return;

    const key = `${role}:${permission}`;
    const enabled = (rolePermissions[role] || []).includes(permission);
    setSavingKey(key);

    setRolePermissions((current) => ({
      ...current,
      [role]: enabled
        ? current[role].filter((item) => item !== permission)
        : [...current[role], permission].sort(),
    }));

    const operation = enabled
      ? supabase.from('role_permissions').delete().eq('role', role).eq('permission', permission)
      : supabase.from('role_permissions').insert({ role, permission });

    const { error } = await operation;

    if (error) {
      console.error('Error updating role permission:', error);
      setRolePermissions((current) => ({
        ...current,
        [role]: enabled
          ? [...current[role], permission].sort()
          : current[role].filter((item) => item !== permission),
      }));
      toast.error(t('admin.permissions.updateFailed'));
      setSavingKey(null);
      return;
    }

    toast.success(
      enabled
        ? t('admin.permissions.permissionDisabled', {
            role: t(`admin.roles.${role}`),
            permission: t(permissionMetadataMap[permission].titleKey),
          })
        : t('admin.permissions.permissionEnabled', {
            role: t(`admin.roles.${role}`),
            permission: t(permissionMetadataMap[permission].titleKey),
          }),
    );
    if (profile?.role === role) {
      await refreshProfile();
    }
    setSavingKey(null);
  };

  const isSectionCollapsed = (sectionId: string) => collapsedSections[sectionId] ?? true;
  const isPageCollapsed = (pageKey: string) => collapsedPages[pageKey] ?? true;

  const allExpanded = useMemo(() => {
    if (!groupedPermissions.length) return false;
    const sectionsOpen = groupedPermissions.every((section) => !(collapsedSections[section.sectionId] ?? true));
    const pagesOpen = nestedPageKeys.every((pageKey) => !(collapsedPages[pageKey] ?? true));
    return sectionsOpen && pagesOpen;
  }, [collapsedPages, collapsedSections, groupedPermissions, nestedPageKeys]);

  const toggleExpandAll = () => {
    const nextCollapsed = allExpanded;
    setCollapsedSections(
      Object.fromEntries(groupedPermissions.map((section) => [section.sectionId, nextCollapsed])),
    );
    setCollapsedPages(Object.fromEntries(nestedPageKeys.map((pageKey) => [pageKey, nextCollapsed])));
  };

  const toggleSectionVisibility = (sectionId: string) => {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !(current[sectionId] ?? true),
    }));
  };

  const togglePageVisibility = (pageKey: string) => {
    setCollapsedPages((current) => ({
      ...current,
      [pageKey]: !(current[pageKey] ?? true),
    }));
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100dvh-5rem)] flex-col gap-2 px-2 pt-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="shrink-0">
          <AppPageHeader
            title={
              <>
                <span>{t('admin.permissions.title')}</span>
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-expanded={allExpanded}
                  aria-label={allExpanded ? t('admin.permissions.collapseAll') : t('admin.permissions.expandAll')}
                  data-testid="permissions-expand-all"
                >
                  {allExpanded ? (
                    <ChevronDown className="h-5 w-5" aria-hidden />
                  ) : (
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </>
            }
            showBack
            fallbackPath="/settings"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="min-h-0 flex-1"
        >
          <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-border/60 shadow-sm">
            {loading ? (
              <div className="flex flex-1 items-center justify-center gap-2 px-6 py-20 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('common.loading')}</span>
              </div>
            ) : (
              <div
                data-testid="permissions-matrix-scroll"
                className="min-h-0 flex-1 overflow-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div
                  className="sticky top-0 z-20 grid items-center gap-2 border-b border-border/60 bg-card/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80"
                  style={{ gridTemplateColumns: matrixGridTemplate }}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t('admin.permissions.featureColumn')}
                  </div>
                  {visibleRoles.map((role) => (
                    <div
                      key={role}
                      className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {t(`admin.roles.${role}`)}
                    </div>
                  ))}
                </div>

                <div className="space-y-4 p-3">
                  {groupedPermissions.map((sectionGroup) => {
                    const sectionCollapsed = isSectionCollapsed(sectionGroup.sectionId);
                    const sectionLabel = t(`admin.permissions.sectionNames.${sectionGroup.sectionId}`);

                    return (
                      <div key={sectionGroup.sectionId} className="space-y-3">
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(sectionGroup.sectionId)}
                          className="flex w-full items-center text-left"
                          aria-expanded={!sectionCollapsed}
                          data-testid={`permissions-section-toggle-${sectionGroup.sectionId}`}
                        >
                          <h3 className="text-base font-semibold text-foreground">{sectionLabel}</h3>
                        </button>

                        {!sectionCollapsed
                          ? sectionGroup.pages.map((pageGroup) => {
                              const pageLabel = getPageLabel(pageGroup.pageId, t);
                              const showPageLabel =
                                pageLabel.trim().toLowerCase() !== sectionLabel.trim().toLowerCase();
                              const pageKey = `${sectionGroup.sectionId}:${pageGroup.pageId}`;
                              const pageCollapsed = showPageLabel ? isPageCollapsed(pageKey) : false;

                              return (
                                <Card
                                  key={`${sectionGroup.sectionId}-${pageGroup.pageId}`}
                                  className="overflow-hidden rounded-2xl border-border/60 shadow-none"
                                >
                                  {showPageLabel ? (
                                    <div className="border-b border-border/60 px-3 py-2.5">
                                      <button
                                        type="button"
                                        onClick={() => togglePageVisibility(pageKey)}
                                        className="flex w-full items-center text-left"
                                        aria-expanded={!pageCollapsed}
                                        data-testid={`permissions-page-toggle-${pageKey}`}
                                      >
                                        <h4 className="text-sm font-semibold text-foreground">{pageLabel}</h4>
                                      </button>
                                    </div>
                                  ) : null}

                                  {!pageCollapsed ? (
                                    <div className="divide-y divide-border/60">
                                      {pageGroup.items.map((entry) => (
                                        <div
                                          key={entry.permission}
                                          className="grid items-center gap-2 rounded-xl px-3 py-2 transition-[background-color,box-shadow] hover:bg-background/40 hover:ring-1 hover:ring-primary/20"
                                          style={{ gridTemplateColumns: matrixGridTemplate }}
                                        >
                                          <div className="min-w-0">
                                            <TooltipProvider delayDuration={120}>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <button
                                                    type="button"
                                                    className="inline-flex max-w-full items-center gap-1 text-left font-medium text-foreground"
                                                  >
                                                    <span className="truncate">{t(entry.titleKey)}</span>
                                                    <CircleHelp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" align="start" className="max-w-xs text-sm">
                                                  {t(entry.descriptionKey)}
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </div>
                                          {visibleRoles.map((role) => {
                                            const enabled = (rolePermissions[role] || []).includes(entry.permission);
                                            const key = `${role}:${entry.permission}`;
                                            const isSaving = savingKey === key;
                                            const isReadOnly = role === 'system';
                                            return (
                                              <div key={key} className="flex justify-center">
                                                <button
                                                  type="button"
                                                  disabled={isReadOnly || isSaving}
                                                  onClick={() => handleTogglePermission(role, entry.permission)}
                                                  className={cn(
                                                    'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                                                    enabled
                                                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                                                      : 'border-border bg-muted text-muted-foreground',
                                                    !isReadOnly &&
                                                      'hover:border-primary/30 hover:bg-primary/10 hover:text-primary',
                                                    (isReadOnly || isSaving) && 'cursor-not-allowed opacity-70',
                                                  )}
                                                  aria-label={`${t(`admin.roles.${role}`)} ${t(entry.titleKey)}`}
                                                >
                                                  {isSaving ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : enabled ? (
                                                    <Check className="h-4 w-4" />
                                                  ) : (
                                                    <X className="h-4 w-4" />
                                                  )}
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </Card>
                              );
                            })
                          : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
