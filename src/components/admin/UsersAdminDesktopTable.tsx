import { Award, BadgeCheck, BadgeX, Loader2, LogIn, Settings2 } from 'lucide-react';
import type { AppRole } from '@/lib/access-control';
import { getCitizenStatusLabelKey } from '@/lib/civic-status';
import { getVerificationCaseBadgeClassName, getVerificationCaseStatusLabelKey } from '@/lib/verification-workflow';
import {
  citizenshipBadgeClassName,
  getAdminCardTitle,
  getDisplayNameParts,
  getEffectiveCitizenshipStatus,
  getEffectiveVerificationStatus,
  getInitials,
  type ProfileRow,
  type UserAdminGroup,
  userExperienceLevelClassMap,
  userExperienceLevelIconMap,
  userExperienceLevelLabelMap,
  type VerificationCaseRow,
} from '@/lib/users-admin';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UsersAdminRolePill } from '@/components/admin/UsersAdminRolePill';

type UsersAdminDesktopTableProps = {
  canLoginAsFromAdmin: boolean;
  levelSavingUserId: string | null;
  overrideSavingUserId: string | null;
  profileUserId?: string | null;
  roleSavingUserId: string | null;
  selectedUserId: string | null;
  switchingUserId: string | null;
  t: (key: string) => string;
  verificationCasesByProfile: Record<string, VerificationCaseRow>;
  visibleGroups: UserAdminGroup[];
  formatDate: (value: string) => string;
  formatRelativeTime: (value?: string | null) => string;
  getActivityTimestamp: (user: ProfileRow) => string;
  isUserOnline: (user: ProfileRow) => boolean;
  onCycleExperienceLevel: (user: ProfileRow) => void;
  onLoginAsUser: (user: ProfileRow) => void;
  onRoleChange: (user: ProfileRow, nextRole: AppRole) => void;
  onSelectUser: (userId: string) => void;
  onVerificationToggle: (user: ProfileRow) => void;
};

type RowOptions = {
  nestLevel?: number;
  isOrganization?: boolean;
  organizationName?: string;
};

export function UsersAdminDesktopTable({
  canLoginAsFromAdmin,
  formatDate,
  formatRelativeTime,
  getActivityTimestamp,
  isUserOnline,
  levelSavingUserId,
  onCycleExperienceLevel,
  onLoginAsUser,
  onRoleChange,
  onSelectUser,
  onVerificationToggle,
  overrideSavingUserId,
  profileUserId,
  roleSavingUserId,
  selectedUserId,
  switchingUserId,
  t,
  verificationCasesByProfile,
  visibleGroups,
}: UsersAdminDesktopTableProps) {
  const renderRow = (user: ProfileRow, options: RowOptions = {}) => {
    const { nestLevel = 0, isOrganization = false, organizationName } = options;
    const isCurrentUser = user.user_id === profileUserId;
    const isLevelSaving = levelSavingUserId === user.id;
    const isSaving = roleSavingUserId === user.id || overrideSavingUserId === user.id || isLevelSaving;
    const isSelected = selectedUserId === user.id;
    const isOnline = isUserOnline(user);
    const displayName = getDisplayNameParts(user);
    const cardTitle =
      getAdminCardTitle(user, { isOrganization, organizationName }) || t('common.anonymousUser');
    const userLevel = user.experience_level in userExperienceLevelIconMap ? user.experience_level : 'entry';
    const LevelIcon = userExperienceLevelIconMap[userLevel];
    const shouldShowProBadge = displayName.hasProfessionalSuffix || userLevel === 'professional';
    const effectiveCitizenshipStatus = getEffectiveCitizenshipStatus(user);
    const verificationCase = verificationCasesByProfile[user.id] || null;
    const verificationStatus = getEffectiveVerificationStatus(user, verificationCase);
    const isVerified = Boolean(user.is_verified);

    return (
      <TableRow
        key={user.id}
        className={cn('group hover:bg-accent/40', isSelected && 'bg-primary/5 hover:bg-primary/5')}
      >
        <TableCell>
          <div className={cn('flex items-center gap-3 text-left', nestLevel > 0 && 'ml-6')}>
            <button type="button" className="shrink-0" onClick={() => onSelectUser(user.id)} aria-label={cardTitle}>
              <Avatar className="h-10 w-10 rounded-2xl border border-border/60">
                <AvatarImage src={user.avatar_url || undefined} alt="" className="rounded-2xl object-cover" />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                  {getInitials(cardTitle, user.username)}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="min-w-0">
              <button
                type="button"
                className="block max-w-full truncate text-left font-medium text-foreground"
                onClick={() => onSelectUser(user.id)}
              >
                {cardTitle}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-w-0 truncate text-left text-sm text-muted-foreground"
                  onClick={() => onSelectUser(user.id)}
                >
                  {user.username ? `@${user.username}` : t('admin.users.noUsername')}
                </button>
                <button
                  type="button"
                  onClick={() => onCycleExperienceLevel(user)}
                  disabled={isLevelSaving}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors',
                    userExperienceLevelClassMap[userLevel],
                    'hover:opacity-90',
                  )}
                  title={t('admin.users.levelCycleHint')}
                >
                  {isLevelSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <LevelIcon className="h-3 w-3" />
                      {userExperienceLevelLabelMap[userLevel]}
                    </>
                  )}
                </button>
                {shouldShowProBadge && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-teal-700 dark:text-teal-300">
                    <Award className="h-3 w-3" />
                    Pro
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  className={cn('rounded-full border', citizenshipBadgeClassName[effectiveCitizenshipStatus])}
                  variant="outline"
                >
                  {t(getCitizenStatusLabelKey(effectiveCitizenshipStatus))}
                </Badge>
                <Badge
                  className={cn('rounded-full border', getVerificationCaseBadgeClassName(verificationStatus))}
                  variant="outline"
                >
                  {t(getVerificationCaseStatusLabelKey(verificationStatus))}
                </Badge>
                {user.is_active_citizen && (
                  <Badge
                    variant="outline"
                    className="rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  >
                    {t('admin.users.activeCitizenBadge')}
                  </Badge>
                )}
                {user.is_governance_eligible && (
                  <Badge
                    variant="outline"
                    className="rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  >
                    {t('admin.users.governanceEligibleBadge')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">{user.official_id || '—'}</TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">{user.social_security_number || '—'}</TableCell>
        <TableCell>
          <div className="flex flex-col items-start gap-1">
            <UsersAdminRolePill
              role={user.role}
              disabled={isCurrentUser || isSaving}
              t={t}
              onRoleChange={(nextRole) => onRoleChange(user, nextRole)}
            />
            {isCurrentUser && <p className="text-xs text-muted-foreground">{t('admin.users.selfRoleHint')}</p>}
          </div>
        </TableCell>
        <TableCell>{user.country || user.country_code || '—'}</TableCell>
        <TableCell>{formatDate(user.created_at)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onSelectUser(user.id)}
              aria-label={t('admin.users.manageAccess')}
              title={t('admin.users.manageAccess')}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onVerificationToggle(user)}
                  disabled={isSaving}
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
                    isVerified
                      ? 'border-sky-500/20 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300'
                      : 'border-border bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                  aria-label={isVerified ? t('admin.users.userIsVerified') : t('admin.users.userIsUnverified')}
                >
                  {isVerified ? <BadgeCheck className="h-3.5 w-3.5" /> : <BadgeX className="h-3.5 w-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {isVerified ? t('admin.users.userIsVerified') : t('admin.users.userIsUnverified')}
              </TooltipContent>
            </Tooltip>
            {canLoginAsFromAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', isCurrentUser && 'opacity-40')}
                onClick={() => onLoginAsUser(user)}
                disabled={isCurrentUser || switchingUserId === user.id}
                aria-label="Request emergency access"
                title="Request emergency access"
              >
                {switchingUserId === user.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span className={cn('text-sm', isOnline && 'font-medium text-emerald-600 dark:text-emerald-300')}>
            {isOnline ? t('admin.users.onlineNow') : formatRelativeTime(getActivityTimestamp(user))}
          </span>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="hidden overflow-x-auto md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.users.userColumn')}</TableHead>
            <TableHead>{t('admin.users.officialIdLabel')}</TableHead>
            <TableHead>{t('admin.users.ssnLabel')}</TableHead>
            <TableHead>{t('admin.users.roleColumn')}</TableHead>
            <TableHead>{t('common.country')}</TableHead>
            <TableHead>{t('admin.users.joinedColumn')}</TableHead>
            <TableHead>{t('admin.users.accessColumn')}</TableHead>
            <TableHead className="text-right">{t('admin.users.lastActiveColumn')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleGroups.map((group) => {
            const rows = [];
            if (group.owner) {
              rows.push(renderRow(group.owner));
            }
            for (const membership of group.organizations) {
              rows.push(
                renderRow(membership.profile, {
                  nestLevel: group.owner ? 1 : 0,
                  isOrganization: true,
                  organizationName: membership.organizationName,
                }),
              );
            }
            return rows;
          })}
        </TableBody>
      </Table>
    </div>
  );
}
