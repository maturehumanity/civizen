import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { AccountSwitcherTrack } from '@/components/layout/AccountSwitcherTrack';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { permissionListHasAny } from '@/lib/access-control';
import { getProfileMenuPageLinks } from '@/lib/app-pages';
import {
  businessConnectDisplayName,
  buildAccountSwitcherOptions,
  collectSwitchableProfileIds,
  orderAccountsAroundCurrent,
  isOwnerSingleBusinessConstraintError,
  normalizeBusinessName,
  parseBusinessConnectMatches,
  shouldUseConnectAction,
  toBusinessUsernameCandidate,
  type BusinessConnectMatch,
} from '@/lib/linked-business-accounts';
import {
  isDuplicateLinkError,
  isMissingBusinessAccessRequestsTableError,
  isMissingLinkedAccountsTableError,
} from '@/lib/linked-accounts-errors';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Briefcase, Link2, Pencil, Plus, RefreshCcw } from 'lucide-react';

type LinkedAccountRow = {
  id: string;
  owner_profile_id: string;
  linked_profile_id: string;
  relationship_type: string;
  owner: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    deleted_at?: string | null;
  } | null;
  linked: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    deleted_at?: string | null;
  } | null;
};

type AccountOption = {
  profileId: string;
  label: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  accountType: 'personal' | 'business' | 'linked';
};

function getInitials(name?: string | null, username?: string | null) {
  const source = name?.trim() || username?.trim() || '?';
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function createEphemeralSupabaseClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function isNetworkFetchError(error: { message?: string | null; details?: string | null } | null | undefined) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('failed to fetch') || message.includes('network');
}

function raceTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export function UserPageMenu({ size = 'md' }: { size?: 'sm' | 'md' } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profile,
    knownAccountSessions,
    switchToKnownAccount,
    pruneKnownAccountSessions,
    signIn,
    signInWithOtp,
  } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccountRow[]>([]);
  const [linkedAccountsFeatureAvailable, setLinkedAccountsFeatureAvailable] = useState(true);
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [linkedAccountsLoadedOnce, setLinkedAccountsLoadedOnce] = useState(false);
  const [linkedError, setLinkedError] = useState<string | null>(null);
  const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPassword, setBusinessPassword] = useState('');
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [businessMatches, setBusinessMatches] = useState<BusinessConnectMatch[]>([]);
  const [selectedBusinessMatch, setSelectedBusinessMatch] = useState<BusinessConnectMatch | null>(null);
  const [lookingUpBusiness, setLookingUpBusiness] = useState(false);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);
  const currentAccountCardRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null);

  const triggerSizeClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const avatarSizeClass = size === 'sm' ? 'h-8 w-8 border' : 'h-10 w-10 border-2';

  const pageLinks = useMemo(
    () =>
      [...getProfileMenuPageLinks(profile?.effective_permissions || [])].sort((a, b) =>
        t(a.labelKey).localeCompare(t(b.labelKey), undefined, { sensitivity: 'base' }),
      ),
    [profile?.effective_permissions, t],
  );

  const canEditProfile = permissionListHasAny(profile?.effective_permissions || [], ['profile.update_self']);

  const accountSessionByProfileId = useMemo(() => {
    const map = new Map<string, typeof knownAccountSessions[number]>();
    knownAccountSessions.forEach((account) => {
      if (account.profileId) {
        map.set(account.profileId, account);
      }
    });
    return map;
  }, [knownAccountSessions]);

  const directlyLinkedProfileIds = useMemo(() => {
    if (!profile?.id) return new Set<string>();
    return collectSwitchableProfileIds(profile.id, linkedAccounts);
  }, [linkedAccounts, profile?.id]);

  const accountOptions = useMemo<AccountOption[]>(() => {
    if (!profile?.id) return [];

    const options: AccountOption[] = [];
    const addOption = (option: AccountOption) => {
      if (!options.find((item) => item.profileId === option.profileId)) {
        options.push(option);
      }
    };

    buildAccountSwitcherOptions({
      currentProfile: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      },
      linkedAccounts,
    }).forEach((item) => {
      addOption({
        profileId: item.profileId,
        label:
          item.accountType === 'business'
            ? t('home.accountSwitchBusiness')
            : item.accountType === 'personal'
              ? t('home.accountSwitchPersonal')
              : t('home.accountSwitchLinked'),
        username: item.username,
        fullName: item.fullName,
        avatarUrl: item.avatarUrl,
        accountType: item.accountType,
      });
    });

    knownAccountSessions.forEach((session) => {
      if (!session.profileId || session.profileId === profile.id) return;
      addOption({
        profileId: session.profileId,
        label: session.accountType === 'business' ? t('home.accountSwitchBusiness') : t('home.accountSwitchLinked'),
        username: session.username,
        fullName: session.fullName,
        avatarUrl: session.avatarUrl,
        accountType: session.accountType === 'business' ? 'business' : 'linked',
      });
    });

    return options;
  }, [
    knownAccountSessions,
    linkedAccounts,
    profile?.avatar_url,
    profile?.full_name,
    profile?.id,
    profile?.username,
    t,
  ]);

  const orderedAccountOptions = useMemo(
    () => orderAccountsAroundCurrent(accountOptions, profile?.id),
    [accountOptions, profile?.id],
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Keep page scroll locked while the profile menu is open so mobile swipes
  // scroll the menu list instead of the underlying page (scroll chaining).
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }

    const preventBackgroundTouchMove = (event: TouchEvent) => {
      const target = event.target as Node | null;
      if (target && panelRef.current?.contains(target)) return;
      event.preventDefault();
    };

    document.addEventListener('touchmove', preventBackgroundTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventBackgroundTouchMove);
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      document.body.style.paddingRight = previous.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!profile?.id || !open || !linkedAccountsFeatureAvailable) return;

    let active = true;
    let settled = false;
    setLinkedLoading(true);
    setLinkedAccountsLoadedOnce(false);
    setLinkedError(null);

    const timeoutId = window.setTimeout(() => {
      if (!active || settled) return;
      setLinkedLoading(false);
      setLinkedError(t('home.accountSwitchLoadFailed'));
    }, 6000);

    supabase
      .from('linked_accounts')
      .select(
        `
          id,
          owner_profile_id,
          linked_profile_id,
          relationship_type,
          owner:profiles!linked_accounts_owner_profile_id_fkey(id, full_name, username, avatar_url, deleted_at),
          linked:profiles!linked_accounts_linked_profile_id_fkey(id, full_name, username, avatar_url, deleted_at)
        `,
      )
      .then(({ data, error }) => {
        if (!active) return;
        settled = true;
        if (error) {
          if (isMissingLinkedAccountsTableError(error)) {
            setLinkedAccountsFeatureAvailable(false);
            setLinkedAccounts([]);
            setLinkedError(null);
            return;
          }
          console.error('Error loading linked accounts:', error);
          setLinkedError(t('home.accountSwitchLoadFailed'));
          setLinkedAccounts([]);
        } else {
          setLinkedAccounts(data ?? []);
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (active) {
          setLinkedLoading(false);
          setLinkedAccountsLoadedOnce(true);
        }
      });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [linkedAccountsFeatureAvailable, open, profile?.id, t]);

  useEffect(() => {
    if (!profile?.id) return;
    if (!open) return;
    if (!linkedAccountsLoadedOnce) return;

    const validProfileIds = new Set<string>([profile.id]);
    linkedAccounts.forEach((row) => {
      if (row.owner?.id && !row.owner?.deleted_at) {
        validProfileIds.add(row.owner.id);
      }
      if (row.linked?.id && !row.linked?.deleted_at) {
        validProfileIds.add(row.linked.id);
      }
    });

    pruneKnownAccountSessions(Array.from(validProfileIds));
  }, [linkedAccounts, linkedAccountsLoadedOnce, open, profile?.id, pruneKnownAccountSessions]);

  useEffect(() => {
    if (!open || orderedAccountOptions.length < 2) return;
    currentAccountCardRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' });
  }, [linkedLoading, open, orderedAccountOptions]);

  useEffect(() => {
    if (!createBusinessOpen) {
      setBusinessMatches([]);
      setSelectedBusinessMatch(null);
      setLookingUpBusiness(false);
      return;
    }

    const name = businessName.trim();
    const email = businessEmail.trim().toLowerCase();
    if (name.length < 2 && !email.includes('@')) {
      setBusinessMatches([]);
      setSelectedBusinessMatch(null);
      setLookingUpBusiness(false);
      return;
    }

    let active = true;
    setLookingUpBusiness(true);
    const timeoutId = window.setTimeout(() => {
      void supabase
        .rpc('lookup_business_accounts_for_connect', {
          p_name: name || null,
          p_email: email || null,
          p_limit: 5,
        })
        .then(({ data, error }) => {
          if (!active) return;
          if (error) {
            setBusinessMatches([]);
            setSelectedBusinessMatch(null);
            return;
          }
          const matches = parseBusinessConnectMatches(data);
          setBusinessMatches(matches);
          setSelectedBusinessMatch((current) => {
            if (current && matches.some((item) => item.profileId === current.profileId)) {
              return matches.find((item) => item.profileId === current.profileId) ?? current;
            }
            return matches.length === 1 ? matches[0] : null;
          });
        })
        .finally(() => {
          if (active) setLookingUpBusiness(false);
        });
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [businessEmail, businessName, createBusinessOpen]);

  const switchToLinkedProfile = async (targetProfileId: string) => {
    const invoke = supabase.functions.invoke('linked-account-switch', {
      body: { targetProfileId },
    });
    const { data, error } = await raceTimeout(invoke, 12000, 'linked-account-switch-timeout');

    if (error || !data?.email || !data?.token) {
      return { error: new Error(t('home.accountSwitchFailed')) };
    }

    const result = await raceTimeout(
      signInWithOtp(
        {
          email: data.email,
          token: data.token,
          type: 'magiclink',
        },
        { preserveCurrentSession: true },
      ),
      8000,
      'linked-account-otp-timeout',
    );

    return result;
  };

  const handleSwitchAccount = async (account: AccountOption) => {
    if (account.profileId === profile?.id || switchingAccountId) return;

    const session = accountSessionByProfileId.get(account.profileId);
    const linkedTarget = directlyLinkedProfileIds.has(account.profileId);
    const switchTargetKey = session?.userId || account.profileId;
    setSwitchingAccountId(switchTargetKey);

    let error: Error | null = null;
    if (session?.userId) {
      try {
        const stored = await raceTimeout(
          switchToKnownAccount(session.userId),
          2500,
          'stored-session-timeout',
        );
        error = stored.error;
      } catch {
        error = new Error(t('home.accountSwitchFailed'));
      }
    }

    if ((!session?.userId || error) && linkedTarget) {
      try {
        const linked = await switchToLinkedProfile(account.profileId);
        error = linked.error;
      } catch {
        error = new Error(t('home.accountSwitchFailed'));
      }
    } else if (!session?.userId && !linkedTarget) {
      error = new Error(t('home.accountSwitchFailed'));
    }

    if (error) {
      toast.error(t('home.accountSwitchFailed'));
    } else {
      toast.success(t('home.accountSwitchSuccess'));
      setOpen(false);
    }
    setSwitchingAccountId(null);
  };

  const resolveProfileIdForUser = async (options: {
    userId: string;
    email: string;
    password: string;
  }) => {
    const ephemeralClient = createEphemeralSupabaseClient();
    if (!ephemeralClient) return null;

    // Try to authenticate in the isolated client to avoid clobbering the current session.
    await ephemeralClient.auth.signInWithPassword({
      email: options.email,
      password: options.password,
    });

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data: ownProfile } = await ephemeralClient
        .from('profiles')
        .select('id')
        .eq('user_id', options.userId)
        .maybeSingle();

      if (ownProfile?.id) {
        await ephemeralClient.auth.signOut();
        return ownProfile.id;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    await ephemeralClient.auth.signOut();
    return null;
  };

  const createBusinessAccountClientSide = async () => {
    const submitBusinessAccessRequest = async (targetProfileId: string) => {
      const { error: requestError } = await supabase.from('business_account_access_requests').insert({
        target_profile_id: targetProfileId,
        requester_profile_id: profile?.id,
      });

      if (!requestError) {
        return t('home.accountSwitchAccessRequestSubmitted');
      }

      if (requestError.code === '23505') {
        return t('home.accountSwitchAccessRequestPending');
      }

      if (isMissingBusinessAccessRequestsTableError(requestError)) {
        return t('home.accountSwitchBusinessExists');
      }

      console.error('Could not create business access request:', requestError);
      return t('home.accountSwitchAccessRequestFailed');
    };

    try {
      if (!profile?.id) {
        return { error: t('home.accountSwitchCreateFailed') } as const;
      }

      const normalizedEmail = businessEmail.trim().toLowerCase();
      const normalizedBusinessName = normalizeBusinessName(businessName);
      const ephemeralClient = createEphemeralSupabaseClient();
      if (!ephemeralClient) {
        return { error: t('home.accountSwitchCreateFailed') } as const;
      }

      const usernameCandidate = toBusinessUsernameCandidate(businessName);
      const existingProfileId = selectedBusinessMatch?.profileId ?? null;

      const { data: existingBusinessProfile } = existingProfileId
        ? { data: { id: existingProfileId } }
        : await supabase
            .from('profiles')
            .select('id')
            .eq('username', usernameCandidate)
            .maybeSingle();

      if (existingBusinessProfile?.id) {
        const { data: existingOwnerLink } = await supabase
          .from('linked_accounts')
          .select('id, owner_profile_id')
          .eq('linked_profile_id', existingBusinessProfile.id)
          .eq('relationship_type', 'business')
          .maybeSingle();

        if (existingOwnerLink?.id) {
          if (existingOwnerLink.owner_profile_id === profile.id) {
            return { error: t('home.accountSwitchAlreadyLinked') } as const;
          }

          const requestMessage = await submitBusinessAccessRequest(existingBusinessProfile.id);
          return {
            error: null,
            accessRequested: true,
            message: requestMessage,
          } as const;
        }
      }

      const { data: signUpData, error: signUpError } = await ephemeralClient.auth.signUp({
        email: normalizedEmail,
        password: businessPassword,
        options: {
          data: {
            full_name: businessName.trim(),
            username: usernameCandidate,
          },
        },
      });

      if (signUpError && !signUpError.message.toLowerCase().includes('already')) {
        const failureMessage = isNetworkFetchError(signUpError)
          ? t('home.accountSwitchCreateFailed')
          : (signUpError.message || t('home.accountSwitchCreateFailed'));
        return { error: failureMessage } as const;
      }

      let businessUserId = signUpData.user?.id ?? null;
      if (!businessUserId) {
        const { data: fallbackSignIn, error: fallbackSignInError } = await ephemeralClient.auth.signInWithPassword({
          email: normalizedEmail,
          password: businessPassword,
        });

        if (fallbackSignInError || !fallbackSignIn.user?.id) {
          const failureMessage = isNetworkFetchError(fallbackSignInError)
            ? t('home.accountSwitchCreateFailed')
            : (fallbackSignInError?.message || t('home.accountSwitchCreateFailed'));
          return { error: failureMessage } as const;
        }

        businessUserId = fallbackSignIn.user.id;
      }

      const linkedProfileId = await resolveProfileIdForUser({
        userId: businessUserId,
        email: normalizedEmail,
        password: businessPassword,
      });

      if (!linkedProfileId) {
        return { error: t('home.accountSwitchCreateFailed') } as const;
      }

      const { error: linkError } = await supabase.from('linked_accounts').insert({
        owner_profile_id: profile.id,
        linked_profile_id: linkedProfileId,
        relationship_type: 'business',
        business_name_normalized: normalizedBusinessName,
      });

      if (linkError) {
        if (isDuplicateLinkError(linkError)) {
          if (isOwnerSingleBusinessConstraintError(linkError)) {
            return { error: t('home.accountSwitchCreateFailed') } as const;
          }
          const message = String(linkError.message || '').toLowerCase();
          if (message.includes('business_name')) {
            return { error: t('home.accountSwitchBusinessExists') } as const;
          }
          return { error: t('home.accountSwitchAlreadyLinked') } as const;
        }
        console.warn('Could not create linked_accounts row:', linkError);
        return { error: t('home.accountSwitchCreateFailed') } as const;
      }

      return { error: null, linkedProfileId } as const;
    } catch (error) {
      return {
        error: isNetworkFetchError(error as { message?: string; details?: string })
          ? t('home.accountSwitchCreateFailed')
          : t('home.accountSwitchCreateFailed'),
      } as const;
    }
  };

  const connectingExisting = shouldUseConnectAction(selectedBusinessMatch);
  const connectNeedsPassword = Boolean(
    selectedBusinessMatch
    && !selectedBusinessMatch.alreadyLinkedToRequester
    && (!selectedBusinessMatch.ownerProfileId || selectedBusinessMatch.ownerProfileId === profile?.id),
  );
  const connectNeedsAccessRequest = Boolean(
    selectedBusinessMatch
    && selectedBusinessMatch.ownerProfileId
    && selectedBusinessMatch.ownerProfileId !== profile?.id
    && !selectedBusinessMatch.alreadyLinkedToRequester,
  );

  const handleCreateBusinessAccount = async () => {
    if (selectedBusinessMatch?.alreadyLinkedToRequester) {
      setBusinessError(t('home.accountSwitchAlreadyLinked'));
      toast.error(t('home.accountSwitchAlreadyLinked'));
      return;
    }

    if (connectNeedsAccessRequest) {
      // Selected company is enough to request access.
    } else if (connectingExisting && connectNeedsPassword) {
      if (!businessEmail.trim() || !businessPassword.trim()) {
        setBusinessError(t('home.accountSwitchConnectMissing'));
        toast.error(t('home.accountSwitchConnectMissing'));
        return;
      }
    } else if (!connectingExisting) {
      if (!businessName.trim() || !businessEmail.trim() || !businessPassword.trim()) {
        setBusinessError(t('home.accountSwitchCreateMissing'));
        toast.error(t('home.accountSwitchCreateMissing'));
        return;
      }
    }

    setCreatingBusiness(true);
    setBusinessError(null);

    const createResult = await createBusinessAccountClientSide();
    if (createResult.accessRequested) {
      const infoMessage = createResult.message || t('home.accountSwitchAccessRequestSubmitted');
      setBusinessError(null);
      toast.success(infoMessage);
      setCreatingBusiness(false);
      setBusinessName('');
      setBusinessEmail('');
      setBusinessPassword('');
      setCreateBusinessOpen(false);
      return;
    }

    const createError = createResult.error;
    if (createError) {
      setBusinessError(createError);
      toast.error(createError);
      setCreatingBusiness(false);
      return;
    }

    const { error: signInError } = await signIn(businessEmail.trim(), businessPassword, {
      preserveCurrentSession: true,
    });

    if (signInError) {
      const errorMessage = String(signInError.message || t('home.accountSwitchSignInFailed'));
      setBusinessError(errorMessage);
      toast.error(errorMessage);
      setCreatingBusiness(false);
      return;
    }

    if (createResult.linkedProfileId) {
      await supabase
        .from('profiles')
        .update({ full_name: businessName.trim() })
        .eq('id', createResult.linkedProfileId);
    }

    toast.success(t(connectingExisting ? 'home.accountSwitchConnectSuccess' : 'home.accountSwitchCreateSuccess'));
    setBusinessName('');
    setBusinessEmail('');
    setBusinessPassword('');
    setBusinessError(null);
    setBusinessMatches([]);
    setSelectedBusinessMatch(null);
    setCreateBusinessOpen(false);
    setCreatingBusiness(false);
    setOpen(false);
  };

  return (
    <div className="relative overflow-visible" ref={panelRef}>
      <button
        type="button"
        data-testid="user-page-menu-trigger"
        data-size={size}
        aria-label={t('home.profileMenuButton')}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex items-center justify-center rounded-full outline-none ring-offset-background transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-primary',
          triggerSizeClass,
        )}
      >
        <Avatar className={cn('shrink-0 border-border', avatarSizeClass)}>
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className={cn('bg-primary/10 text-primary', size === 'sm' && 'text-[10px]')}>
            {getInitials(profile?.full_name, profile?.username)}
          </AvatarFallback>
        </Avatar>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="page-list"
            data-testid="user-page-menu-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(320px,calc(100vw-1.5rem))] max-h-[calc(100dvh-6.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-3xl border border-border/70 bg-card/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/92 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="space-y-2 p-2 pt-2">
              <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {t('home.accountSwitchTitle')}
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label={t('home.accountSwitchAddBusiness')}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setCreateBusinessOpen(true);
                          }}
                          data-testid="user-page-menu-add-business"
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        {t('home.accountSwitchAddBusiness')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('home.accountSwitchSubtitle')}</p>
                </div>

                <div className="mt-3 space-y-2">
                  {linkedError ? (
                    <p className="text-xs text-destructive">{linkedError}</p>
                  ) : (
                    <>
                      <AccountSwitcherTrack className="-mx-1 px-1 pb-0.5">
                        {orderedAccountOptions.map((account) => {
                          const session = accountSessionByProfileId.get(account.profileId);
                          const isCurrent = account.profileId === profile?.id;
                          const canSwitch = Boolean(
                            session?.userId || directlyLinkedProfileIds.has(account.profileId),
                          );
                          const switchTargetKey = session?.userId || account.profileId;
                          const isSwitching = switchingAccountId === switchTargetKey;
                          const displayName = account.fullName || t('common.anonymousUser');
                          const cardClassName = cn(
                            'relative flex snap-center flex-col rounded-2xl border px-3 py-2.5 text-left',
                            orderedAccountOptions.length > 1 ? 'w-[62%] min-w-[62%] shrink-0' : 'w-full',
                            isCurrent
                              ? 'border-primary/40 bg-primary/10'
                              : 'border-border/60 bg-background/80',
                            !isCurrent && canSwitch && 'transition-colors hover:bg-accent/70',
                            isSwitching && 'opacity-80',
                          );
                          const cardBody = (
                            <>
                              <div className="flex items-start justify-between gap-1">
                                {isCurrent ? (
                                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                                    {t('home.accountSwitchCurrent')}
                                  </span>
                                ) : isSwitching ? (
                                  <RefreshCcw className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
                                ) : (
                                  <span className="h-4" />
                                )}
                                {isCurrent &&
                                  canEditProfile &&
                                  (account.accountType === 'personal' || account.accountType === 'business') && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex">
                                          <button
                                            type="button"
                                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            aria-label={t('features.pages.editProfile')}
                                            data-account-switcher-no-drag=""
                                            data-testid={`user-page-menu-edit-profile-${account.profileId}`}
                                            onClick={(event) => {
                                              event.preventDefault();
                                              event.stopPropagation();
                                              navigate('/settings/profile');
                                              setOpen(false);
                                            }}
                                          >
                                            <Pencil className="h-4 w-4" aria-hidden />
                                          </button>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="left">
                                        {t('features.pages.editProfile')}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                              </div>
                              <p className="mt-1 truncate text-sm font-medium text-foreground">{displayName}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {account.username ? `@${account.username}` : t('home.profileMenuNoUsername')}
                              </p>
                              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                {account.label}
                              </p>
                            </>
                          );

                          if (isCurrent) {
                            return (
                              <div
                                key={account.profileId}
                                ref={currentAccountCardRef}
                                data-testid={`account-switcher-card-${account.profileId}`}
                                data-current="true"
                                aria-current="true"
                                className={cardClassName}
                              >
                                {cardBody}
                              </div>
                            );
                          }

                          return (
                            <button
                              key={account.profileId}
                              type="button"
                              data-testid={`account-switcher-card-${account.profileId}`}
                              data-current="false"
                              aria-label={t('home.accountSwitchTo', { name: displayName })}
                              className={cardClassName}
                              disabled={Boolean(switchingAccountId)}
                              onClick={() => handleSwitchAccount(account)}
                            >
                              {cardBody}
                            </button>
                          );
                        })}
                      </AccountSwitcherTrack>
                      {linkedLoading && (
                        <p className="text-[11px] text-muted-foreground">Syncing linked accounts...</p>
                      )}
                      {accountOptions.length === 0 && !linkedLoading && (
                        <p className="text-xs text-muted-foreground">
                          {t('home.accountSwitchNoLinked')}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 touch-pan-y">
              {pageLinks.map((page) => {
                const Icon = page.icon;
                const isCurrent = location.pathname === page.path;

                return (
                  <button
                    key={page.path}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-accent/70',
                      isCurrent && 'bg-primary/10 text-primary hover:bg-primary/10',
                    )}
                    onClick={() => {
                      navigate(page.path);
                      setOpen(false);
                    }}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/80',
                        isCurrent && 'border-primary/20 bg-primary/10 text-primary',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{t(page.labelKey)}</span>
                      {isCurrent && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                          {t('home.currentPage')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog
        open={createBusinessOpen}
        onOpenChange={(nextOpen) => {
          setCreateBusinessOpen(nextOpen);
          if (!nextOpen) {
            setBusinessMatches([]);
            setSelectedBusinessMatch(null);
            setBusinessError(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{t('home.accountSwitchCreateTitle')}</DialogTitle>
            <DialogDescription>{t('home.accountSwitchCreateSubtitle')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <OutlinedField label={t('home.accountSwitchBusinessNameLabel')} htmlFor="add-business-name">
              <Input
                id="add-business-name"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder={t('home.accountSwitchBusinessNamePlaceholder')}
                autoComplete="organization"
              />
            </OutlinedField>

            {businessMatches.length > 0 && (
              <div className="space-y-2" data-testid="add-business-matches">
                {businessMatches.map((match) => {
                  const selected = selectedBusinessMatch?.profileId === match.profileId;
                  return (
                    <button
                      key={match.profileId}
                      type="button"
                      data-testid={`add-business-match-${match.profileId}`}
                      onClick={() => setSelectedBusinessMatch(match)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors',
                        selected ? 'border-primary bg-primary/10' : 'border-border/60 hover:bg-accent/60',
                      )}
                    >
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={match.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {getInitials(businessConnectDisplayName(match, businessName), match.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {businessConnectDisplayName(match, businessName)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {match.alreadyLinkedToRequester
                            ? t('home.accountSwitchAlreadyLinkedHint')
                            : match.ownerFullName
                              ? t('home.accountSwitchOwnedBy', { name: match.ownerFullName })
                              : t('home.accountSwitchExistingCompany')}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {lookingUpBusiness && businessMatches.length === 0 && (
              <p className="text-[11px] text-muted-foreground">{t('home.accountSwitchLookingUp')}</p>
            )}

            {(!connectingExisting || connectNeedsPassword) && (
              <>
                <OutlinedField label={t('common.email')} htmlFor="add-business-email">
                  <Input
                    id="add-business-email"
                    type="email"
                    value={businessEmail}
                    onChange={(event) => setBusinessEmail(event.target.value)}
                    placeholder={t('home.accountSwitchBusinessEmailPlaceholder')}
                    autoComplete="username"
                  />
                </OutlinedField>
                <OutlinedField label={t('common.password')} htmlFor="add-business-password">
                  <Input
                    id="add-business-password"
                    type="password"
                    value={businessPassword}
                    onChange={(event) => setBusinessPassword(event.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    autoComplete="new-password"
                  />
                </OutlinedField>
              </>
            )}

            {connectingExisting && connectNeedsPassword && (
              <p className="text-xs text-muted-foreground">{t('home.accountSwitchConnectHint')}</p>
            )}
            {connectNeedsAccessRequest && (
              <p className="text-xs text-muted-foreground">{t('home.accountSwitchRequestAccessHint')}</p>
            )}
          </div>

          {businessError && (
            <p className="text-sm text-destructive">{businessError}</p>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateBusinessOpen(false)} disabled={creatingBusiness}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={handleCreateBusinessAccount}
              disabled={creatingBusiness || selectedBusinessMatch?.alreadyLinkedToRequester}
              data-testid="add-business-submit"
            >
              {connectingExisting ? <Link2 className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
              {creatingBusiness
                ? t(connectingExisting ? 'home.accountSwitchConnecting' : 'home.accountSwitchCreating')
                : t(connectingExisting ? 'home.accountSwitchConnectAction' : 'home.accountSwitchCreateAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
