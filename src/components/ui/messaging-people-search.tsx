import { Loader2, UserPlus } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { DeviceContact, DeviceContactsAccess } from '@/lib/device-contacts';

export type DirectoryContact = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

function initials(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function MessagingPeopleSearch({
  queryActive,
  loading,
  directoryResults,
  registeredDeviceContacts,
  inviteContacts,
  access,
  nativeAvailable,
  webPickerAvailable,
  onAllowContacts,
  onNotNow,
  onRetryContacts,
  onPickWebContacts,
  onOpenProfile,
  onAddMember,
  onInvite,
  labels,
}: {
  queryActive: boolean;
  loading: boolean;
  directoryResults: DirectoryContact[];
  registeredDeviceContacts: Array<DirectoryContact & { deviceName: string }>;
  inviteContacts: DeviceContact[];
  access: DeviceContactsAccess;
  nativeAvailable: boolean;
  webPickerAvailable: boolean;
  onAllowContacts: () => void;
  onNotNow: () => void;
  onRetryContacts: () => void;
  onPickWebContacts: () => void;
  onOpenProfile: (id: string) => void;
  onAddMember: (contact: DirectoryContact) => void;
  onInvite: (contact: DeviceContact | { name: string; phones?: string[] }) => void;
  labels: {
    loading: string;
    noResults: string;
    viewProfile: string;
    add: string;
    invite: string;
    inviteSomeone: string;
    permissionTitle: string;
    permissionBody: string;
    allow: string;
    notNow: string;
    denied: string;
    retry: string;
    chooseFromPhone: string;
    onCivizen: string;
    inviteToCivizen: string;
    anonymous: string;
  };
}) {
  const showBanner = nativeAvailable && (access === 'prompt' || access === 'denied');
  const memberIds = new Set(directoryResults.map((row) => row.id));
  const extraRegistered = registeredDeviceContacts.filter((row) => !memberIds.has(row.id));
  const hasMembers = directoryResults.length > 0 || extraRegistered.length > 0;
  const hasInvites = inviteContacts.length > 0;

  return (
    <div className="space-y-2">
      {showBanner ? (
        <div className="rounded-md border border-border bg-background px-3 py-2">
          {access === 'prompt' ? (
            <>
              <p className="text-sm font-medium text-foreground">{labels.permissionTitle}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{labels.permissionBody}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" className="h-8 px-3 text-xs" onClick={onAllowContacts}>
                  {labels.allow}
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={onNotNow}>
                  {labels.notNow}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">{labels.denied}</p>
              <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={onRetryContacts}>
                {labels.retry}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {webPickerAvailable && !nativeAvailable ? (
        <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={onPickWebContacts}>
          {labels.chooseFromPhone}
        </Button>
      ) : null}

      {queryActive ? (
        <div className="max-h-52 overflow-y-auto rounded-md border border-border bg-background">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              {labels.loading}
            </div>
          ) : !hasMembers && !hasInvites ? (
            <div className="space-y-2 px-3 py-2">
              <p className="text-xs text-muted-foreground">{labels.noResults}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={() => onInvite({ name: '' })}
              >
                {labels.inviteSomeone}
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {hasMembers && extraRegistered.length + directoryResults.length > 0 && inviteContacts.length > 0 ? (
                <li className="px-3 py-1.5 text-[11px] text-muted-foreground">{labels.onCivizen}</li>
              ) : null}
              {[...directoryResults, ...extraRegistered].map((row) => (
                <li key={row.id}>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={row.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {initials(row.full_name || row.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.full_name || row.username || labels.anonymous}
                      </p>
                      {row.username ? (
                        <p className="truncate text-xs text-muted-foreground">@{row.username}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => onOpenProfile(row.id)}
                      >
                        {labels.viewProfile}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1 px-2 text-xs"
                        onClick={() => onAddMember(row)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {labels.add}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
              {hasInvites ? (
                <li className="px-3 py-1.5 text-[11px] text-muted-foreground">{labels.inviteToCivizen}</li>
              ) : null}
              {inviteContacts.map((contact) => (
                <li key={contact.id}>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                        {initials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{contact.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{contact.phones[0]}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      onClick={() => onInvite(contact)}
                    >
                      {labels.invite}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
