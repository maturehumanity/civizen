import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomeHappinessShortcut } from '@/components/home/HomeHappinessShortcut';
import { CivizenScore } from '@/components/ui/CivizenScore';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { usePageSecondaryNav } from '@/hooks/usePageSecondaryNav';
import { supabase } from '@/integrations/supabase/client';
import { type Endorsement } from '@/lib/scoring';
import { buildScoreFromProfileActivity, formatScoreValue, type CategoryScoreInput, type CivizenScoreResponse } from '@/lib/civizen-score';
import { ownProfileRingDisplay } from '@/lib/civizen-score-ring-display';
import { scoreCoverageCaption, scoreEvidenceEstimateCaption, scoreProgressCaption } from '@/lib/civizen-score-caption';
import { getDevelopmentalScoreColor } from '@/lib/civizen-score-tiers';
import { countSkillsFromEntry, declaredSkillNamesFromEntry } from '@/lib/profile-skills';
import { countTrainingsFromEntry } from '@/lib/profile-trainings';
import { parseExperienceEntries, cumulativeExperienceMonths } from '@/lib/profile-experience';
import {
  demonstratedProjectsFromContributionEvents,
  demonstratedSkillsFromContributionEvents,
  loadContributionEventsThenSync,
  scoreContributionsFromEvents,
  type ContributionEvent,
} from '@/lib/civizen-contributions';
import {
  loadPerformanceRatings,
  scorePerformanceFromEvents,
} from '@/lib/civizen-performance';
import { type PillarId } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, BadgeX, Briefcase, Check, ChevronDown, Eye, Landmark, Loader2, MessageCircle, Share2, Sparkles, Star, ThumbsUp, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  canShowPublishToSocial,
  isOfficialCivizenOrgProfile,
  SOCIAL_PROVIDERS,
  type SocialProvider,
} from '@/lib/civizen-org-account';
import {
  fetchSocialConnectionStatuses,
  fetchSocialCrosspostsForPosts,
  providerDisplayName,
  publishPostToSocial,
  type SocialConnectionStatus,
  type SocialCrosspostStatus,
} from '@/lib/social-accounts';
import { focusHomePostComposerFromChrome } from '@/lib/home-post-composer-focus';
import {
  fetchPostViewStats,
  isRecordablePostId,
  recordPostView,
  type PostViewStats,
} from '@/lib/post-views';
import {
  buildHomeFeedItems,
  createPlainRepost,
  createRepostWithThoughts,
  deleteRepost,
  fetchRecentPostReposts,
  fetchRepostCounts,
  fetchViewerRepostMap,
  type PostPreview,
  type PostRepostRow,
} from '@/lib/post-reposts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HomePostEmbeddedOriginal, HomeFullOriginalBody } from '@/components/home/HomePostEmbeddedOriginal';
import { HomeRepostMenu } from '@/components/home/HomeRepostMenu';
import { HomeRepostThoughtsDialog } from '@/components/home/HomeRepostThoughtsDialog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { SlowRunningText } from '@/components/ui/slow-running-text';
import { useDevelopmentStories } from '@/lib/use-development-stories';
import {
  behaviorHighlightsBeyondSummary,
  buildCuratedStoryList,
  buildReaderFacingSummary,
  expectedBehaviorAddsUniqueDetail,
  originalInstructionAddsUniqueDetail,
  rephrasedAddsUniqueDetail,
  type CuratedStoryListItem,
} from '@/lib/development-story-curation';

interface RecentEndorsement {
  id: string;
  stars: number;
  pillar: PillarId;
  comment?: string;
  created_at: string;
  endorser: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  is_edited: boolean | null;
  edited_at?: string | null;
  syncStatus?: 'local' | 'remote';
  author: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface PostComment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

type RawPostRecord = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  is_edited: boolean | null;
  edited_at?: string | null;
  syncStatus?: 'local' | 'remote';
  author: Post['author'];
};

type FeedQueryError = {
  code?: string;
  message?: string;
} | null | undefined;

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [educationCount, setEducationCount] = useState(0);
  const [verifiedEducationCount, setVerifiedEducationCount] = useState(0);
  const [educationLevels, setEducationLevels] = useState<string[]>([]);
  const [trainingCount, setTrainingCount] = useState(0);
  const [skillCount, setSkillCount] = useState(0);
  const [declaredSkillNames, setDeclaredSkillNames] = useState<string[]>([]);
  const [demonstratedSkills, setDemonstratedSkills] = useState<
    ReturnType<typeof demonstratedSkillsFromContributionEvents>
  >([]);
  const [demonstratedProjects, setDemonstratedProjects] = useState<
    ReturnType<typeof demonstratedProjectsFromContributionEvents>
  >([]);
  const [experienceCount, setExperienceCount] = useState(0);
  const [experienceMonths, setExperienceMonths] = useState(0);
  const [contributionInput, setContributionInput] = useState<CategoryScoreInput | null>(null);
  const [performanceInput, setPerformanceInput] = useState<CategoryScoreInput | null>(null);
  const [recentEndorsements, setRecentEndorsements] = useState<RecentEndorsement[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postLikes, setPostLikes] = useState<Record<string, string[]>>({});
  const [postComments, setPostComments] = useState<Record<string, PostComment[]>>({});
  const [postViewStats, setPostViewStats] = useState<Record<string, PostViewStats>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState<string | null>(null);
  const [feedBackendUnavailable, setFeedBackendUnavailable] = useState(false);
  const [optimisticLikeStates, setOptimisticLikeStates] = useState<Record<string, boolean>>({});
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [isCivizenOrgAccount, setIsCivizenOrgAccount] = useState(false);
  const [socialConnections, setSocialConnections] = useState<SocialConnectionStatus[]>([]);
  const [socialCrossposts, setSocialCrossposts] = useState<Record<string, SocialCrosspostStatus[]>>({});
  const [publishingKey, setPublishingKey] = useState<string | null>(null);
  const [postReposts, setPostReposts] = useState<PostRepostRow[]>([]);
  const [repostCounts, setRepostCounts] = useState<Record<string, number>>({});
  const [viewerRepostByOriginal, setViewerRepostByOriginal] = useState<Record<string, string>>({});
  const [repostBusyPostId, setRepostBusyPostId] = useState<string | null>(null);
  const [thoughtsOriginal, setThoughtsOriginal] = useState<PostPreview | null>(null);
  const [fullOriginal, setFullOriginal] = useState<PostPreview | null>(null);
  const [homeTab, setHomeTab] = useState<'all' | 'favourite' | 'stories'>('all');
  const [storyGroupTab, setStoryGroupTab] = useState<'development' | 'suggestions'>('development');
  const [storySectionFilter, setStorySectionFilter] = useState<string>('all');
  const [storyAreaFilter, setStoryAreaFilter] = useState<string>('all');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const { stories: developmentStories, loading: storiesLoading } = useDevelopmentStories({
    enabled: homeTab === 'stories',
  });
  const postEditorRef = useRef<HTMLDivElement | null>(null);
  const postDraftHydratedRef = useRef(false);
  const postContentRef = useRef(postContent);
  const recordedPostViewsRef = useRef<Set<string>>(new Set());
  const canPost = postContent.trim().length > 0;
  const composerPlaceholder = t('home.whatsOnYourMind');
  postContentRef.current = postContent;
  useEffect(() => {
    if (profile?.id) {
      setOptimisticLikeStates({});
      fetchData();
      const cleanup = subscribeToPosts();
      return cleanup;
    }
  }, [profile?.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isOfficialCivizenOrgProfile(profile?.id, { username: profile?.username });
      if (cancelled) return;
      setIsCivizenOrgAccount(ok);
      if (!ok) {
        setSocialConnections([]);
        return;
      }
      try {
        const statuses = await fetchSocialConnectionStatuses();
        if (!cancelled) setSocialConnections(statuses);
      } catch {
        if (!cancelled) setSocialConnections([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.username]);

  useEffect(() => {
    if (!isCivizenOrgAccount || posts.length === 0) {
      setSocialCrossposts({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const ownPostIds = posts.filter((post) => post.author_id === profile?.id).map((post) => post.id);
      const map = await fetchSocialCrosspostsForPosts(ownPostIds);
      if (!cancelled) setSocialCrossposts(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [isCivizenOrgAccount, posts, profile?.id]);

  useEffect(() => {
    if (!profile?.id || posts.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-home-post-id]'));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const postId = entry.target.getAttribute('data-home-post-id');
          if (!postId || !isRecordablePostId(postId) || recordedPostViewsRef.current.has(postId)) {
            return;
          }
          recordedPostViewsRef.current.add(postId);
          void recordPostView(postId)
            .then((stats) => {
              if (!stats) return;
              setPostViewStats((prev) => ({
                ...prev,
                [postId]: {
                  uniqueVisitors: Math.max(prev[postId]?.uniqueVisitors || 0, stats.uniqueVisitors),
                  totalViews: Math.max(prev[postId]?.totalViews || 0, stats.totalViews),
                },
              }));
            })
            .catch((error) => {
              recordedPostViewsRef.current.delete(postId);
              if (!isMissingTableError(error as FeedQueryError)) {
                console.error('Error recording post view:', error);
              }
            });
        });
      },
      { threshold: 0.45 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [posts, profile?.id]);

  const readPostEditorText = (el: HTMLDivElement) => {
    const raw = (el.innerText ?? el.textContent ?? '').replace(/\u00a0/g, ' ');
    return raw === '\n' ? '' : raw;
  };

  const syncPostEditorDom = (value: string) => {
    const el = postEditorRef.current;
    if (!el) return;
    if (readPostEditorText(el) === value) return;
    el.textContent = value;
  };

  const normalizePost = (raw: RawPostRecord): Post => ({
    id: raw.id,
    content: raw.content,
    created_at: raw.created_at,
    author_id: raw.author_id,
    is_edited: raw.is_edited,
    edited_at: raw.edited_at,
    syncStatus: raw.syncStatus ?? 'remote',
    author: raw.author as Post['author'],
  });

  const isMissingTableError = (error: FeedQueryError) => {
    return error?.code === 'PGRST205' || /could not find the table|schema cache/i.test(error?.message || '');
  };

  const getFeedStorageKey = (kind: 'posts' | 'likes' | 'comments') => {
    return profile?.id ? `civizen-home-${kind}:${profile.id}` : `civizen-home-${kind}:anonymous`;
  };

  const getPostDraftStorageKey = () => {
    return profile?.id ? `civizen-home-post-draft:${profile.id}` : 'civizen-home-post-draft:anonymous';
  };

  const readStoredValue = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const writeStoredValue = (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage quota and serialization errors.
    }
  };

  const removeStoredValue = (key: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors.
    }
  };

  const persistPostDraft = (content: string) => {
    const key = getPostDraftStorageKey();
    if (!content.trim()) {
      removeStoredValue(key);
      return;
    }
    writeStoredValue(key, content);
  };

  const clearPostComposerDraft = () => {
    setPostContent('');
    removeStoredValue(getPostDraftStorageKey());
    syncPostEditorDom('');
  };

  useEffect(() => {
    postDraftHydratedRef.current = false;
    if (!profile?.id) {
      setPostContent('');
      syncPostEditorDom('');
      return;
    }
    const stored = readStoredValue<string>(getPostDraftStorageKey(), '');
    const next = typeof stored === 'string' ? stored : '';
    setPostContent(next);
    // Wait a frame so the editor node exists after mount/tab show.
    window.requestAnimationFrame(() => {
      syncPostEditorDom(next);
      postDraftHydratedRef.current = true;
    });
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id || !postDraftHydratedRef.current) return;
    const timer = window.setTimeout(() => {
      persistPostDraft(postContent);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [postContent, profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const flushDraft = () => {
      persistPostDraft(postContentRef.current);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushDraft();
    };

    window.addEventListener('pagehide', flushDraft);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [profile?.id]);

  const mergePostsById = (existingPosts: Post[], incomingPosts: Post[]) => {
    const merged = new Map<string, Post>();

    existingPosts.forEach((post) => {
      merged.set(post.id, post);
    });

    incomingPosts.forEach((post) => {
      merged.set(post.id, post);
    });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const hydrateLocalFallbackData = () => {
    const localPosts = readStoredValue<Post[]>(getFeedStorageKey('posts'), []);
    const localLikes = readStoredValue<Record<string, string[]>>(getFeedStorageKey('likes'), {});
    const localComments = readStoredValue<Record<string, PostComment[]>>(getFeedStorageKey('comments'), {});

    if (localPosts.length > 0) {
      setPosts((prev) => mergePostsById(prev, localPosts));
    }

    if (Object.keys(localLikes).length > 0) {
      setPostLikes((prev) => ({ ...prev, ...localLikes }));
    }

    if (Object.keys(localComments).length > 0) {
      setPostComments((prev) => ({ ...prev, ...localComments }));
    }
  };

  const persistLocalPosts = (nextPosts: Post[]) => {
    const localPosts = nextPosts.filter((post) => post.syncStatus === 'local');
    writeStoredValue(getFeedStorageKey('posts'), localPosts);
  };

  const persistLocalLikes = (nextLikes: Record<string, string[]>) => {
    writeStoredValue(getFeedStorageKey('likes'), nextLikes);
  };

  const persistLocalComments = (nextComments: Record<string, PostComment[]>) => {
    writeStoredValue(getFeedStorageKey('comments'), nextComments);
  };

  const mergeFetchedLikeState = (
    current: Record<string, string[]>,
    fetched: Record<string, string[]>
  ) => {
    const next = { ...current };

    Object.entries(fetched).forEach(([postId, userIds]) => {
      if (!(postId in next)) {
        next[postId] = userIds;
      }
    });

    return next;
  };

  const mergeFetchedCommentState = (
    current: Record<string, PostComment[]>,
    fetched: Record<string, PostComment[]>
  ) => {
    const next = { ...current };

    Object.entries(fetched).forEach(([postId, comments]) => {
      if (!(postId in next)) {
        next[postId] = comments;
      }
    });

    return next;
  };

  const fetchPostInteractions = async (postIds: string[]) => {
    if (postIds.length === 0) {
      setPostLikes({});
      setPostComments({});
      setPostViewStats({});
      return false;
    }

    const [{ data: likesData, error: likesError }, { data: commentsData, error: commentsError }] =
      await Promise.all([
        supabase
          .from('post_likes')
          .select('post_id, user_id')
          .in('post_id', postIds),
        supabase
          .from('post_comments')
          .select(`
            id,
            post_id,
            content,
            created_at,
            author_id,
            author:profiles!post_comments_author_id_fkey(id, username, full_name, avatar_url)
          `)
          .in('post_id', postIds)
          .order('created_at', { ascending: true }),
      ]);

    let backendUnavailable = false;

    if (likesError) {
      console.error('Error fetching post likes:', likesError);
      if (isMissingTableError(likesError)) {
        backendUnavailable = true;
      }
    } else {
      const nextLikes: Record<string, string[]> = {};
      (likesData || []).forEach((like) => {
        if (!nextLikes[like.post_id]) {
          nextLikes[like.post_id] = [];
        }
        nextLikes[like.post_id].push(like.user_id);
      });
      setPostLikes((prev) => mergeFetchedLikeState(prev, nextLikes));
    }

    if (commentsError) {
      console.error('Error fetching post comments:', commentsError);
      if (isMissingTableError(commentsError)) {
        backendUnavailable = true;
      }
    } else {
      const nextComments: Record<string, PostComment[]> = {};
      (commentsData || []).forEach((comment) => {
        if (!nextComments[comment.post_id]) {
          nextComments[comment.post_id] = [];
        }
        nextComments[comment.post_id].push({
          ...comment,
          author: comment.author as PostComment['author'],
        });
      });
      setPostComments((prev) => mergeFetchedCommentState(prev, nextComments));
    }

    try {
      const nextViewStats = await fetchPostViewStats(postIds);
      setPostViewStats((prev) => {
        const merged = { ...prev };
        Object.entries(nextViewStats).forEach(([postId, stats]) => {
          if (!(postId in merged)) {
            merged[postId] = stats;
          } else {
            merged[postId] = {
              uniqueVisitors: Math.max(merged[postId].uniqueVisitors, stats.uniqueVisitors),
              totalViews: Math.max(merged[postId].totalViews, stats.totalViews),
            };
          }
        });
        return merged;
      });
    } catch (viewError) {
      console.error('Error fetching post views:', viewError);
      if (isMissingTableError(viewError as FeedQueryError)) {
        backendUnavailable = true;
      }
    }

    return backendUnavailable;
  };

  const fetchData = async () => {
    if (!profile?.id) return;
    setFeedBackendUnavailable(false);

    try {
      const applyContributionEvents = (events: ContributionEvent[]) => {
        setContributionInput(scoreContributionsFromEvents(events));
        setDemonstratedSkills(demonstratedSkillsFromContributionEvents(events));
        setDemonstratedProjects(demonstratedProjectsFromContributionEvents(events));
        void loadPerformanceRatings(profile.id).then((ratings) => {
          setPerformanceInput(scorePerformanceFromEvents(events, ratings, profile.id));
        });
      };

      const [
        { data: endorsementData },
        { data: educationData },
        { data: trainingData },
        { data: skillsData },
        { data: experienceData },
        contributionEvents,
        { data: recentData },
        postsResult,
      ] = await Promise.all([
        supabase
          .from('endorsements')
          .select('*')
          .eq('endorsed_id', profile.id)
          .eq('is_hidden', false),
        (supabase as any)
          .from('profile_education_entries')
          .select('id, education_level, verification_status')
          .eq('profile_id', profile.id),
        (supabase as any)
          .from('profile_training_entries')
          .select('training_names')
          .eq('profile_id', profile.id)
          .maybeSingle(),
        (supabase as any)
          .from('profile_skills_entries')
          .select('hard_skill_names, soft_skill_names, skill_names')
          .eq('profile_id', profile.id)
          .maybeSingle(),
        (supabase as any)
          .from('profile_experience_entries')
          .select('experiences')
          .eq('profile_id', profile.id)
          .maybeSingle(),
        loadContributionEventsThenSync(profile.id, profile.user_id, supabase, applyContributionEvents),
        supabase
          .from('endorsements')
          .select(`
            id,
            stars,
            pillar,
            comment,
            created_at,
            endorser:profiles!endorsements_endorser_id_fkey(id, username, full_name, avatar_url)
          `)
          .eq('endorsed_id', profile.id)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('posts')
          .select(`
            id,
            content,
            created_at,
            author_id,
            is_edited,
            edited_at,
            author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (endorsementData) {
        setEndorsements(endorsementData.map(e => ({
          ...e,
          pillar: e.pillar as PillarId,
        })));
      }

      if (educationData) {
        setEducationCount(educationData.length);
        setVerifiedEducationCount(
          educationData.filter(
            (row: { verification_status?: string }) =>
              row.verification_status === 'verified' ||
              row.verification_status === 'certificate_provided',
          ).length,
        );
        setEducationLevels(
          educationData
            .map((row: { education_level?: string | null }) =>
              typeof row.education_level === 'string' ? row.education_level : '',
            )
            .filter((level: string) => level.trim().length > 0),
        );
      } else {
        setEducationCount(0);
        setVerifiedEducationCount(0);
        setEducationLevels([]);
      }

      setTrainingCount(countTrainingsFromEntry(trainingData));
      setSkillCount(countSkillsFromEntry(skillsData));
      setDeclaredSkillNames(declaredSkillNamesFromEntry(skillsData));
      const experienceEntries = parseExperienceEntries(experienceData?.experiences);
      setExperienceCount(experienceEntries.length);
      setExperienceMonths(cumulativeExperienceMonths(experienceEntries));
      applyContributionEvents(contributionEvents);

      if (recentData) {
        setRecentEndorsements(recentData.map(e => ({
          ...e,
          pillar: e.pillar as PillarId,
          endorser: e.endorser as unknown as RecentEndorsement['endorser'],
        })));
      }

      const { data: postsData, error: postsError } = postsResult;

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        if (isMissingTableError(postsError)) {
          setFeedBackendUnavailable(true);
          hydrateLocalFallbackData();
        }
      } else {
        const normalizedPosts = (postsData || []).map(normalizePost);
        setPosts((prev) => mergePostsById(prev, normalizedPosts));
        // Paint shell + posts first; interactions fill in without blocking.
        void fetchPostInteractions(normalizedPosts.map((post) => post.id)).then((interactionsUnavailable) => {
          if (!interactionsUnavailable) {
            setFeedBackendUnavailable(false);
          }
        });
        void (async () => {
          try {
            const [reposts, counts, viewerMap] = await Promise.all([
              fetchRecentPostReposts(50),
              fetchRepostCounts(normalizedPosts.map((post) => post.id)),
              profile?.id
                ? fetchViewerRepostMap(
                    profile.id,
                    normalizedPosts.map((post) => post.id),
                  )
                : Promise.resolve({} as Record<string, string>),
            ]);
            setPostReposts(reposts);
            setRepostCounts(counts);
            setViewerRepostByOriginal(viewerMap);
            const extraIds = [
              ...reposts.map((row) => row.commentary_post_id),
              ...reposts.map((row) => row.original_post_id),
            ].filter((id): id is string => Boolean(id));
            if (extraIds.length > 0) {
              void fetchPostInteractions(Array.from(new Set(extraIds)));
            }
          } catch (error) {
            console.error('Error fetching post reposts:', error);
          }
        })();
        hydrateLocalFallbackData();
      }
    } finally {
      setLoading(false);
    }
  };

  const score: CivizenScoreResponse = useMemo(
    () =>
      buildScoreFromProfileActivity({
        userId: profile?.id,
        educationCount,
        verifiedEducationCount,
        educationLevels,
        trainingCount,
        skillCount,
        declaredSkillNames,
        demonstratedSkills,
        demonstratedProjects,
        experienceCount,
        experienceMonths,
        endorsementCount: endorsements.length,
        contributions: contributionInput,
        performance: performanceInput,
      }),
    [
      profile?.id,
      educationCount,
      verifiedEducationCount,
      educationLevels,
      trainingCount,
      skillCount,
      declaredSkillNames,
      demonstratedSkills,
      demonstratedProjects,
      experienceCount,
      experienceMonths,
      endorsements.length,
      contributionInput,
      performanceInput,
    ],
  );

  const homeSecondaryNav = useMemo(
    () => ({
      defaultValue: 'all',
      items: [
        { id: 'all', label: 'All' },
        { id: 'favourite', label: 'Favourite' },
        {
          id: 'stories',
          label: 'Stories',
          title: 'Requests and implemented outcomes, documented for ecosystem transparency.',
        },
      ],
      value: homeTab,
      onChange: (value: string) => {
        if (value === 'all' || value === 'favourite' || value === 'stories') {
          setHomeTab(value);
        }
      },
      fab:
        homeTab === 'stories' && storyGroupTab === 'suggestions'
          ? {
              label: 'Add suggestion',
              ariaLabel: 'Add a new suggestion story',
              onClick: () => navigate('/governance/workspace'),
            }
          : null,
    }),
    [homeTab, storyGroupTab, navigate],
  );
  usePageSecondaryNav(homeSecondaryNav);

  const showHomeGovernanceHub = Boolean(profile);
  const showScoreCard = homeTab === 'all' || homeTab === 'favourite';
  const showComposer = homeTab === 'all';
  const showQuickActions = homeTab === 'all';
  const showPostsFeed = homeTab === 'all';
  const showRecentEndorsements = homeTab === 'all' || homeTab === 'favourite';
  const showDevelopmentStories = homeTab === 'stories';
  const homeScoreTierId = score.tier.finalTier ?? 'explorer';
  const homeScoreTierLabel = t(`score.tier.${homeScoreTierId}`);
  const homePointsToNextLabel = scoreProgressCaption(score, t) || null;
  const homeRing = ownProfileRingDisplay(score);
  const curatedStories = useMemo<CuratedStoryListItem[]>(
    () => buildCuratedStoryList(developmentStories),
    [developmentStories],
  );
  const sectionFilters = useMemo(() => Array.from(new Set(curatedStories.map((story) => story.section))), [curatedStories]);
  const areaFilters = useMemo(() => Array.from(new Set(curatedStories.map((story) => story.area))), [curatedStories]);
  const filteredStories = useMemo(() => {
    return curatedStories.filter((story) => {
      const matchesSection = storySectionFilter === 'all' || story.section === storySectionFilter;
      const matchesArea = storyAreaFilter === 'all' || story.area === storyAreaFilter;
      return matchesSection && matchesArea;
    });
  }, [curatedStories, storyAreaFilter, storySectionFilter]);
  const storyKindTab = storyGroupTab === 'suggestions' ? 'suggestion' : 'development';
  const visibleStories = useMemo(
    () => filteredStories.filter((story) => (story.storyKind ?? 'development') === storyKindTab),
    [filteredStories, storyKindTab],
  );
  useEffect(() => {
    if (visibleStories.length === 0) {
      setSelectedStoryId(null);
      return;
    }

    if (selectedStoryId && !visibleStories.some((story) => story.id === selectedStoryId)) {
      setSelectedStoryId(null);
    }
  }, [selectedStoryId, visibleStories]);

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPillarName = (id: PillarId) => {
    switch (id) {
      case 'education_skills':
        return t('pillars.educationShort');
      case 'culture_ethics':
        return t('pillars.cultureShort');
      case 'responsibility_reliability':
        return t('pillars.responsibilityShort');
      case 'environment_community':
        return t('pillars.communityShort');
      case 'economy_contribution':
        return t('pillars.economyShort');
      default:
        return id;
    }
  };

  const getDisplayName = (person?: { full_name?: string; username?: string }) => {
    return person?.full_name || person?.username || t('common.anonymousUser');
  };

  const formatRelativeTime = (createdAt: string) => {
    const now = Date.now();
    const date = new Date(createdAt).getTime();
    const diffMs = now - date;

    if (diffMs < 60_000) return t('home.justNow');
    if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m`;
    if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h`;
    if (diffMs < 604_800_000) return `${Math.floor(diffMs / 86_400_000)}d`;

    return new Date(createdAt).toLocaleDateString();
  };

  const subscribeToPosts = () => {
    if (feedBackendUnavailable) {
      return () => undefined;
    }

    const channel = supabase
      .channel('home-posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          supabase
            .from('posts')
            .select(`
              id,
              content,
              created_at,
              author_id,
              is_edited,
              edited_at,
              author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single()
            .then(({ data, error }) => {
              if (error || !data) return;
              const normalized = normalizePost(data);
              setPosts((prev) => {
                return mergePostsById(prev, [normalized]);
              });
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createPost = async () => {
    if (!postContent.trim() || !profile?.id || isPosting) return;
    setIsPosting(true);

    const content = postContent.trim();
    const localPost: Post = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      created_at: new Date().toISOString(),
      author_id: profile.id,
      is_edited: false,
      edited_at: null,
      syncStatus: 'local',
      author: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      },
    };

    try {
      if (feedBackendUnavailable) {
        setPosts((prev) => mergePostsById(prev, [localPost]));
        setPostLikes((prev) => ({ ...prev, [localPost.id]: [] }));
        setPostComments((prev) => ({ ...prev, [localPost.id]: [] }));
        persistLocalPosts(mergePostsById(readStoredValue<Post[]>(getFeedStorageKey('posts'), []), [localPost]));
        toast.message(t('home.savedLocallyPost'), {
          description: t('home.savedLocallyPostDescription'),
        });
        clearPostComposerDraft();
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          author_id: profile.id,
          content,
        })
        .select(`
          id,
          content,
          created_at,
          author_id,
          is_edited,
          edited_at,
          author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Error creating post:', error);
        if (isMissingTableError(error)) {
          setFeedBackendUnavailable(true);
          setPosts((prev) => mergePostsById(prev, [localPost]));
          setPostLikes((prev) => ({ ...prev, [localPost.id]: [] }));
          setPostComments((prev) => ({ ...prev, [localPost.id]: [] }));
          persistLocalPosts(mergePostsById(readStoredValue<Post[]>(getFeedStorageKey('posts'), []), [localPost]));
          toast.message(t('home.savedLocallyPost'), {
            description: t('home.savedLocallyPostDescription'),
          });
          clearPostComposerDraft();
        } else {
          toast.error(t('home.couldNotCreatePost'), {
            description: t('common.tryAgainMoment'),
          });
        }
        return;
      }

      if (data) {
        const normalized = normalizePost(data);
        setPosts((prev) => mergePostsById(prev, [normalized]));
        setPostLikes(prev => ({ ...prev, [normalized.id]: [] }));
        setPostComments(prev => ({ ...prev, [normalized.id]: [] }));
        clearPostComposerDraft();
        toast.success(t('home.postedToFeed'));
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setPosts((prev) => mergePostsById(prev, [localPost]));
      setPostLikes((prev) => ({ ...prev, [localPost.id]: [] }));
      setPostComments((prev) => ({ ...prev, [localPost.id]: [] }));
      persistLocalPosts(mergePostsById(readStoredValue<Post[]>(getFeedStorageKey('posts'), []), [localPost]));
      toast.message(t('home.savedLocallyPost'), {
        description: t('home.savedLocallyPostDescription'),
      });
      clearPostComposerDraft();
    } finally {
      setIsPosting(false);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!profile?.id || likingPostId === postId) return;

    const likedByUsers = postLikes[postId] || [];
    const serverHasLiked = likedByUsers.includes(profile.id);
    const hasLiked = optimisticLikeStates[postId] ?? serverHasLiked;
    const updatedLikes = hasLiked
      ? likedByUsers.filter((userId) => userId !== profile.id)
      : [...likedByUsers, profile.id];
    const nextHasLiked = !hasLiked;

    setLikingPostId(postId);
    setOptimisticLikeStates((prev) => ({ ...prev, [postId]: nextHasLiked }));
    setPostLikes((prev) => {
      const next = { ...prev, [postId]: updatedLikes };
      if (feedBackendUnavailable) {
        persistLocalLikes(next);
      }
      return next;
    });

    if (feedBackendUnavailable) {
      setLikingPostId(null);
      return;
    }

    const query = supabase.from('post_likes');
    const { error } = hasLiked
      ? await query.delete().eq('post_id', postId).eq('user_id', profile.id)
      : await query.insert({
          post_id: postId,
          user_id: profile.id,
        });

    if (error) {
      console.error('Error toggling like:', error);
      if (error.code === '23505' || /duplicate key/i.test(error.message || '')) {
        setOptimisticLikeStates((prev) => ({
          ...prev,
          [postId]: true,
        }));
        setLikingPostId(null);
        return;
      }

      if (isMissingTableError(error)) {
        setFeedBackendUnavailable(true);
        const fallbackLikes = { ...postLikes, [postId]: updatedLikes };
        setOptimisticLikeStates((prev) => ({
          ...prev,
          [postId]: nextHasLiked,
        }));
        setPostLikes(fallbackLikes);
        persistLocalLikes(fallbackLikes);
        toast.message(t('home.savedLocallyPost'), {
          description: t('home.savedLocallyLikeDescription'),
        });
      } else {
        // Roll back optimistic UI when the server rejected the like.
        setOptimisticLikeStates((prev) => ({
          ...prev,
          [postId]: hasLiked,
        }));
        setPostLikes((prev) => ({
          ...prev,
          [postId]: likedByUsers,
        }));
        toast.error(t('home.couldNotSaveLike'), {
          description: t('common.tryAgainMoment'),
        });
      }
    } else {
      setOptimisticLikeStates((prev) => ({
        ...prev,
        [postId]: nextHasLiked,
      }));
    }

    setLikingPostId(null);
  };

  const activeIdentityLabel =
    profile?.full_name?.trim() ||
    (profile?.username ? `@${profile.username}` : '') ||
    t('home.someone');

  const feedItems = useMemo(
    () => buildHomeFeedItems(posts as PostPreview[], postReposts),
    [posts, postReposts],
  );

  const refreshRepostState = async (postIds: string[]) => {
    if (!profile?.id) return;
    try {
      const [reposts, counts, viewerMap] = await Promise.all([
        fetchRecentPostReposts(50),
        fetchRepostCounts(postIds),
        fetchViewerRepostMap(profile.id, postIds),
      ]);
      setPostReposts(reposts);
      setRepostCounts(counts);
      setViewerRepostByOriginal(viewerMap);
    } catch (error) {
      console.error('Error refreshing reposts:', error);
    }
  };

  const handlePlainRepost = async (original: Post) => {
    if (!profile?.id || feedBackendUnavailable || !isRecordablePostId(original.id)) {
      toast.error(t('home.couldNotRepost'));
      return;
    }
    if (viewerRepostByOriginal[original.id]) {
      toast.message(t('home.alreadyReposted'));
      return;
    }
    setRepostBusyPostId(original.id);
    try {
      await createPlainRepost({
        originalPostId: original.id,
        reposterProfileId: profile.id,
      });
      toast.success(t('home.repostedToFeed'));
      await refreshRepostState([
        original.id,
        ...posts.map((post) => post.id),
      ]);
    } catch (error) {
      console.error('Error creating plain repost:', error);
      toast.error(t('home.couldNotRepost'), {
        description: t('common.tryAgainMoment'),
      });
    } finally {
      setRepostBusyPostId(null);
    }
  };

  const handleRepostWithThoughts = async (commentary: string) => {
    if (!profile?.id || !thoughtsOriginal?.id) return;
    const result = await createRepostWithThoughts({
      originalPostId: thoughtsOriginal.id,
      reposterProfileId: profile.id,
      commentary,
    });
    const commentaryAsPost: Post = {
      id: result.commentaryPost.id,
      content: result.commentaryPost.content,
      created_at: result.commentaryPost.created_at,
      author_id: result.commentaryPost.author_id,
      is_edited: false,
      edited_at: null,
      syncStatus: 'remote',
      author: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      },
    };
    setPosts((prev) => mergePostsById(prev, [commentaryAsPost]));
    toast.success(t('home.repostedWithThoughts'));
    await refreshRepostState([
      thoughtsOriginal.id,
      commentaryAsPost.id,
      ...posts.map((post) => post.id),
    ]);
  };

  const handleUndoRepost = async (originalPostId: string) => {
    const repostId = viewerRepostByOriginal[originalPostId];
    if (!repostId) return;
    setRepostBusyPostId(originalPostId);
    try {
      await deleteRepost(repostId);
      toast.message(t('home.repostRemoved'));
      await refreshRepostState([originalPostId, ...posts.map((post) => post.id)]);
    } catch (error) {
      console.error('Error removing repost:', error);
      toast.error(t('home.couldNotRemoveRepost'), {
        description: t('common.tryAgainMoment'),
      });
    } finally {
      setRepostBusyPostId(null);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handlePublishToSocial = async (postId: string, provider: SocialProvider) => {
    const key = `${postId}:${provider}`;
    if (publishingKey === key) return;
    setPublishingKey(key);
    try {
      await publishPostToSocial({ postId, provider });
      setSocialCrossposts((prev) => {
        const existing = (prev[postId] || []).filter((row) => row.provider !== provider);
        return {
          ...prev,
          [postId]: [...existing, { provider, status: 'published', externalPostId: null }],
        };
      });
      toast.success(t('home.publishToSuccess', { network: providerDisplayName(provider) }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('home.publishToFailed', { network: providerDisplayName(provider) }),
      );
    } finally {
      setPublishingKey(null);
    }
  };

  const submitComment = async (postId: string) => {
    if (!profile?.id || submittingCommentPostId === postId) return;
    const content = commentDrafts[postId]?.trim();
    if (!content) return;

    setSubmittingCommentPostId(postId);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: profile.id,
          content,
        })
        .select(`
          id,
          post_id,
          content,
          created_at,
          author_id,
          author:profiles!post_comments_author_id_fkey(id, username, full_name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Error creating comment:', error);
        if (isMissingTableError(error)) {
          setFeedBackendUnavailable(true);
          const localComment: PostComment = {
            id: `local-comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            post_id: postId,
            content,
            created_at: new Date().toISOString(),
            author_id: profile.id,
            author: {
              id: profile.id,
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            },
          };

          setPostComments((prev) => {
            const updated = {
              ...prev,
              [postId]: [...(prev[postId] || []), localComment],
            };
            persistLocalComments(updated);
            return updated;
          });
          setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
          setExpandedComments((prev) => ({ ...prev, [postId]: true }));
          toast.message(t('home.savedLocallyPost'), {
            description: t('home.savedLocallyCommentDescription'),
          });
        }
        return;
      }

      if (data) {
        setPostComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), {
            ...data,
            author: data.author as PostComment['author'],
          }],
        }));
        setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
        setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      }
    } catch (err) {
      console.error('Error creating comment:', err);
    } finally {
      setSubmittingCommentPostId(null);
    }
  };

  if (!profile?.id) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-pulse-soft text-muted-foreground">{t('common.loading')}</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between gap-4 pr-[5.75rem]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {t('home.welcomeUser', { name: profile?.full_name?.split(' ')[0] || t('home.friend') })}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-lg text-muted-foreground">
              <span>{t('home.worldCitizen')}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded-full',
                        profile?.is_verified
                          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300'
                          : 'bg-muted text-muted-foreground',
                      )}
                      aria-label={profile?.is_verified ? t('home.verifiedBadge') : t('home.unverifiedBadge')}
                    >
                      {profile?.is_verified ? <BadgeCheck className="h-3.5 w-3.5" /> : <BadgeX className="h-3.5 w-3.5" />}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {profile?.is_verified ? t('home.userIsVerified') : t('home.userIsUnverified')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </motion.div>

        {/* Score Card */}
        {showScoreCard ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-border/70 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-5 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md sm:p-6">
              <TooltipProvider delayDuration={200}>
                <div className="flex items-start gap-4 sm:gap-6">
                  {homePointsToNextLabel ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="shrink-0 cursor-default outline-none"
                          tabIndex={0}
                          aria-label={homePointsToNextLabel}
                        >
                          <CivizenScore
                            score={homeRing.value}
                            size="md"
                            showLabel={false}
                            tier={score.tier.finalTier}
                            emptyLabel="—"
                            presentation={homeRing.presentation === 'provisional' ? 'provisional' : 'established'}
                            centerCaption={homeRing.presentation === 'provisional' ? t('score.estimateLabel') : null}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{homePointsToNextLabel}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="shrink-0">
                      <CivizenScore
                        score={homeRing.value}
                        size="md"
                        showLabel={false}
                        tier={score.tier.finalTier}
                        emptyLabel="—"
                        presentation={homeRing.presentation === 'provisional' ? 'provisional' : 'established'}
                        centerCaption={homeRing.presentation === 'provisional' ? t('score.estimateLabel') : null}
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl font-bold uppercase tracking-wide text-foreground">
                      {t('home.yourCivizenScore')}
                    </h2>
                    {score.overall.score == null ? (
                      <>
                        <div className="mt-1 flex items-center gap-1.5">
                          {homePointsToNextLabel ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p
                                  className={`cursor-default font-display text-2xl font-bold outline-none ${getDevelopmentalScoreColor(
                                    null,
                                    homeScoreTierId,
                                  )}`}
                                  tabIndex={0}
                                  aria-label={`${t('score.notEstablishedYet')}. ${homePointsToNextLabel}`}
                                >
                                  {t('score.notEstablishedYet')}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">{homePointsToNextLabel}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <p
                              className={`font-display text-2xl font-bold ${getDevelopmentalScoreColor(
                                null,
                                homeScoreTierId,
                              )}`}
                            >
                              {t('score.notEstablishedYet')}
                            </p>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-[28px] w-[28px] min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/80 text-primary outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary/20"
                                aria-label={t('home.viewScoreDetails')}
                                onClick={() => navigate('/profile')}
                              >
                                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[16rem] space-y-1">
                              <p>{t('home.viewScoreDetails')}</p>
                              <p className="text-xs opacity-90">{t('home.viewScoreDetailsFormationNote')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {scoreEvidenceEstimateCaption(score, t) ?? t('home.scoreBuildingHint')}
                        </p>
                        {scoreCoverageCaption(score, t) ? (
                          <p className="text-sm text-muted-foreground">{scoreCoverageCaption(score, t)}</p>
                        ) : null}
                        <div className="mt-2 flex justify-end">
                          <HomeHappinessShortcut profileId={profile?.id} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mt-1 flex items-center gap-1.5">
                          <p className="font-display text-2xl font-bold text-foreground">
                            {formatScoreValue(score.overall.score)} / 100
                          </p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-[28px] w-[28px] min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/80 text-primary outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary/20"
                                aria-label={t('home.viewScoreDetails')}
                                onClick={() => navigate('/profile')}
                              >
                                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[16rem] space-y-1">
                              <p>{t('home.viewScoreDetails')}</p>
                              <p className="text-xs opacity-90">{t('home.viewScoreDetailsFormationNote')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          {score.tier.finalTier ? (
                            homePointsToNextLabel ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p
                                    className={`min-w-0 truncate cursor-default text-sm font-semibold uppercase tracking-wide outline-none ${getDevelopmentalScoreColor(
                                      score.overall.score,
                                      score.tier.finalTier,
                                    )}`}
                                    tabIndex={0}
                                    aria-label={`${homeScoreTierLabel}. ${homePointsToNextLabel}`}
                                  >
                                    {homeScoreTierLabel}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">{homePointsToNextLabel}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <p
                                className={`min-w-0 truncate text-sm font-semibold uppercase tracking-wide ${getDevelopmentalScoreColor(
                                  score.overall.score,
                                  score.tier.finalTier,
                                )}`}
                              >
                                {homeScoreTierLabel}
                              </p>
                            )
                          ) : null}
                          <HomeHappinessShortcut profileId={profile?.id} className="shrink-0" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TooltipProvider>
            </Card>
          </motion.div>
        ) : null}

        {/* Quick Actions */}
        {showHomeGovernanceHub && showQuickActions ? (
          <motion.div
            className={cn('grid gap-3', 'grid-cols-1')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              className="cursor-pointer border-border/70 bg-card/95 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md sm:p-4"
              onClick={() => navigate('/governance')}
            >
              <div className="flex items-center gap-3">
                <Landmark className="h-8 w-8 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{t('home.governanceHub')}</h3>
                  <p className="text-xs text-muted-foreground">{t('home.governanceHubDescription')}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : null}

        {/* Create Post / Share an idea block */}
        {showComposer ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card
              className={`p-3 transition-all duration-200 sm:p-4 ${
                isComposerFocused
                  ? 'border-primary/20 shadow-md shadow-primary/10 -translate-y-0.5'
                  : 'border-border/80 shadow-none'
              }`}
            >
              <div
                className={cn(
                  'flex min-w-0 gap-2 sm:gap-3',
                  postContent.trim() ? 'flex-col' : 'items-center',
                )}
              >
                <div
                  data-home-post-composer=""
                  className={cn(
                    'relative min-w-0 flex-1 overflow-hidden rounded-2xl border px-3 py-2.5 transition-[border-color,box-shadow,background-color] sm:px-4 sm:py-3',
                    canPost
                      ? 'border-primary/30 bg-primary/5 shadow-sm'
                      : 'border-border bg-background',
                    isComposerFocused && 'border-primary/60 ring-2 ring-primary/10',
                  )}
                  onMouseDown={(event) => {
                    focusHomePostComposerFromChrome(event, postEditorRef.current, {
                      disabled: isPosting,
                    });
                  }}
                  onPointerDown={(event) => {
                    // Touch / pen: same chrome-focus path as mouse.
                    if (event.pointerType === 'mouse') return;
                    focusHomePostComposerFromChrome(event, postEditorRef.current, {
                      disabled: isPosting,
                    });
                  }}
                >
                  <Avatar
                    aria-hidden
                    className="pointer-events-none float-left mb-1.5 mr-3 h-10 w-10 [shape-outside:circle(50%)] [shape-margin:0.45rem] sm:mb-2 sm:mr-3.5 sm:h-12 sm:w-12"
                  >
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {!postContent ? (
                    <div className="pointer-events-none absolute inset-y-0 left-[3.35rem] right-3 z-[1] flex items-center sm:left-[4.15rem] sm:right-4">
                      <SlowRunningText
                        text={composerPlaceholder}
                        onlyWhenOverflow
                        className="min-w-0 flex-1 text-sm leading-6 text-muted-foreground"
                      />
                    </div>
                  ) : null}
                  <div
                    ref={postEditorRef}
                    role="textbox"
                    aria-multiline="true"
                    aria-label={composerPlaceholder}
                    contentEditable={!isPosting}
                    tabIndex={isPosting ? -1 : 0}
                    suppressContentEditableWarning
                    className="min-h-10 w-full whitespace-pre-wrap break-words text-sm leading-6 text-foreground outline-none sm:min-h-12"
                    onInput={(event) => {
                      const next = readPostEditorText(event.currentTarget);
                      setPostContent(next);
                    }}
                    onFocus={() => setIsComposerFocused(true)}
                    onBlur={() => {
                      setIsComposerFocused(false);
                      persistPostDraft(postContentRef.current);
                    }}
                    onPaste={(event) => {
                      event.preventDefault();
                      const text = event.clipboardData.getData('text/plain');
                      document.execCommand('insertText', false, text);
                    }}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                        event.preventDefault();
                        createPost();
                      }
                    }}
                  />
                  <div className="clear-both h-0 w-full" aria-hidden />
                </div>
                {!postContent.trim() ? (
                  <Button
                    size="sm"
                    className="h-11 shrink-0 rounded-2xl px-4 transition-all sm:h-12 sm:px-5 disabled:border disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                    onClick={createPost}
                    disabled={isPosting || !canPost}
                  >
                    {isPosting ? t('home.posting') : t('home.post')}
                  </Button>
                ) : (
                  <div className="flex justify-end gap-2 sm:gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 shrink-0 rounded-2xl px-3 sm:h-12 sm:px-4"
                      onClick={clearPostComposerDraft}
                      disabled={isPosting}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      className="h-11 shrink-0 rounded-2xl bg-primary px-4 text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md sm:h-12 sm:px-5"
                      onClick={createPost}
                      disabled={isPosting || !canPost}
                    >
                      {isPosting ? t('home.posting') : t('home.post')}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ) : null}

        {/* User Posts Feed */}
        {showPostsFeed ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
          {feedBackendUnavailable && (
            <Card className="mb-4 border-amber-500/25 bg-amber-500/5 p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">{t('home.localFeedModeTitle')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('home.localFeedModeDescription')}
              </p>
            </Card>
          )}

          {feedItems.length === 0 ? (
            <Card className="mb-4 border-2 border-dashed border-border/70 bg-card/70 p-6 shadow-sm">
              {loading ? (
                <div className="space-y-3" aria-busy="true" aria-label={t('common.loading')}>
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted/50" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted/40" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-muted/40" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('home.noPostsYet')}
                </p>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {feedItems.map((item, index) => {
                const post = item.post as Post;
                const interactionPostId = item.interactionPostId;
                const repostTargetPostId = item.repostTargetPostId;
                const likes = postLikes[interactionPostId] || [];
                const comments = postComments[interactionPostId] || [];
                const viewStats = postViewStats[interactionPostId] || { uniqueVisitors: 0, totalViews: 0 };
                const serverHasLiked = profile?.id ? likes.includes(profile.id) : false;
                const hasLiked = optimisticLikeStates[interactionPostId] ?? serverHasLiked;
                const likeCountDelta = hasLiked === serverHasLiked ? 0 : hasLiked ? 1 : -1;
                const likeCount = Math.max(0, likes.length + likeCountDelta);
                const isCommentsOpen = !!expandedComments[interactionPostId];
                const draftComment = commentDrafts[interactionPostId] || '';
                const isSubmittingComment = submittingCommentPostId === interactionPostId;
                const repostCount = repostCounts[repostTargetPostId] || 0;
                const alreadyReposted = Boolean(viewerRepostByOriginal[repostTargetPostId]);
                const showPublish = canShowPublishToSocial({
                  isOfficialOrg: isCivizenOrgAccount,
                  viewerProfileId: profile?.id,
                  postAuthorId: post.author_id,
                });

                return (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.04 }}
                  >
                    <Card
                      data-home-post-id={interactionPostId}
                      className="border-border/70 bg-card/95 p-4 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
                    >
                      <div className="min-w-0 space-y-2">
                        {item.kind === 'plain_repost' ? (
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('home.repostedThis', {
                              person:
                                item.repost?.reposter?.full_name ||
                                item.repost?.reposter?.username ||
                                activeIdentityLabel,
                            })}
                          </p>
                        ) : null}

                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={post.author?.avatar_url || undefined} />
                            <AvatarFallback className="bg-secondary text-sm text-secondary-foreground">
                              {getInitials(post.author?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {getDisplayName(post.author)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(item.sortAt)}
                            </p>
                          </div>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={t('home.views')}
                              >
                                <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="space-y-0.5 text-xs">
                              <p>
                                {t('home.viewsUniqueLabel', {
                                  count: String(viewStats.uniqueVisitors),
                                })}
                              </p>
                              <p>
                                {t('home.viewsTotalLabel', {
                                  count: String(Math.max(viewStats.totalViews, viewStats.uniqueVisitors)),
                                })}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {item.kind === 'plain_repost' ? null : (
                          <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                            {post.content}
                          </p>
                        )}

                        {item.kind === 'quote_repost' ? (
                          <div className="space-y-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {t('home.repostedFrom')}
                            </p>
                            <HomePostEmbeddedOriginal
                              original={item.embeddedOriginal}
                              unavailableLabel={t('home.originalPostUnavailable')}
                              originalBadgeLabel={t('home.originalPost')}
                              seeFullLabel={t('home.seeFullPost')}
                              onOpenFull={() =>
                                setFullOriginal(item.embeddedOriginal as PostPreview | null)
                              }
                            />
                          </div>
                        ) : null}

                        {item.kind === 'plain_repost' ? (
                          <HomePostEmbeddedOriginal
                            original={item.embeddedOriginal}
                            unavailableLabel={t('home.originalPostUnavailable')}
                            originalBadgeLabel={t('home.originalPost')}
                            seeFullLabel={t('home.seeFullPost')}
                            onOpenFull={() =>
                              setFullOriginal(item.embeddedOriginal as PostPreview | null)
                            }
                          />
                        ) : null}

                        <div className="border-t border-border/60 pt-2.5">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`gap-1.5 rounded-xl px-2.5 sm:gap-2 sm:px-3 ${hasLiked ? 'bg-primary/10 text-primary hover:bg-primary/15' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}`}
                              onClick={() => toggleLike(interactionPostId)}
                              disabled={likingPostId === interactionPostId}
                            >
                              <ThumbsUp className={`h-4 w-4 ${hasLiked ? 'fill-primary' : ''}`} />
                              {hasLiked ? t('home.liked') : t('home.like')}
                              {likeCount > 0 ? ` (${likeCount})` : ''}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 rounded-xl px-2.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground sm:gap-2 sm:px-3"
                              onClick={() => toggleComments(interactionPostId)}
                            >
                              <MessageCircle className="h-4 w-4" />
                              {t('home.comment')}
                              {comments.length > 0 ? ` (${comments.length})` : ''}
                            </Button>

                            <HomeRepostMenu
                              activeIdentityLabel={activeIdentityLabel}
                              repostLabel={t('home.repost')}
                              repostWithThoughtsLabel={t('home.repostWithThoughts')}
                              plainRepostDescription={t('home.repostPlainDescription')}
                              thoughtsDescription={t('home.repostThoughtsDescription')}
                              postingAsLabel={t('home.postingAs')}
                              alreadyRepostedLabel={t('home.alreadyReposted')}
                              undoRepostLabel={t('home.undoRepost')}
                              count={repostCount}
                              alreadyReposted={alreadyReposted}
                              busy={repostBusyPostId === repostTargetPostId}
                              disabled={feedBackendUnavailable || !isRecordablePostId(repostTargetPostId)}
                              onPlainRepost={() => {
                                const target =
                                  item.kind === 'plain_repost'
                                    ? item.embeddedOriginal
                                    : item.kind === 'quote_repost'
                                      ? item.embeddedOriginal
                                      : post;
                                if (target) void handlePlainRepost(target as Post);
                              }}
                              onRepostWithThoughts={() => {
                                const target =
                                  item.kind === 'original'
                                    ? post
                                    : item.embeddedOriginal;
                                if (target) setThoughtsOriginal(target);
                              }}
                              onUndoRepost={() => void handleUndoRepost(repostTargetPostId)}
                            />

                            {showPublish ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="gap-1.5 rounded-xl px-2.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground sm:gap-2 sm:px-3"
                                  >
                                    <Share2 className="h-4 w-4" />
                                    {t('home.publishTo')}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-52 p-2">
                                  <div className="space-y-1">
                                    {SOCIAL_PROVIDERS.map((provider) => {
                                      const connection = socialConnections.find((row) => row.provider === provider);
                                      const published = (socialCrossposts[interactionPostId] || []).some(
                                        (row) => row.provider === provider && row.status === 'published',
                                      );
                                      const busy = publishingKey === `${interactionPostId}:${provider}`;
                                      const labelKey =
                                        provider === 'linkedin'
                                          ? 'home.publishToLinkedIn'
                                          : provider === 'facebook'
                                            ? 'home.publishToFacebook'
                                            : 'home.publishToX';

                                      if (published) {
                                        return (
                                          <Button
                                            key={provider}
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start gap-2"
                                            disabled
                                          >
                                            <Check className="h-4 w-4 text-primary" />
                                            {t(labelKey)} · {t('home.publishToAlready')}
                                          </Button>
                                        );
                                      }

                                      if (!connection?.connected) {
                                        return (
                                          <Button
                                            key={provider}
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start gap-2 text-muted-foreground"
                                            onClick={() => navigate('/settings/social-accounts')}
                                          >
                                            <Share2 className="h-4 w-4" />
                                            {t(labelKey)} · {t('home.publishToConnect')}
                                          </Button>
                                        );
                                      }

                                      return (
                                        <Button
                                          key={provider}
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="w-full justify-start gap-2"
                                          disabled={busy}
                                          onClick={() => void handlePublishToSocial(interactionPostId, provider)}
                                        >
                                          {busy ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Share2 className="h-4 w-4" />
                                          )}
                                          {busy ? t('home.publishToPublishing') : t(labelKey)}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : null}
                          </div>
                        </div>

                        {isCommentsOpen && (
                          <div className="space-y-3 pt-1">
                            {comments.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                {t('home.noCommentsYet')}
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {comments.map((comment) => (
                                  <div key={comment.id} className="rounded-2xl border border-border/50 bg-muted/35 p-3 shadow-sm">
                                    <p className="text-xs font-medium text-foreground">
                                      {getDisplayName(comment.author)}
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                                      {comment.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-2">
                              <textarea
                                className="min-h-[68px] w-full resize-none rounded-2xl border border-border/70 bg-background/90 p-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                                placeholder={t('home.writeComment')}
                                value={draftComment}
                                onChange={(event) =>
                                  setCommentDrafts((prev) => ({
                                    ...prev,
                                    [interactionPostId]: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                className="rounded-xl px-4"
                                onClick={() => submitComment(interactionPostId)}
                                disabled={isSubmittingComment || !draftComment.trim()}
                              >
                                {isSubmittingComment ? t('home.posting') : t('home.postComment')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
          </motion.div>
        ) : null}

        {showDevelopmentStories ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <Card className="border-border/70 bg-card/95 p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={storyGroupTab === 'development' ? 'default' : 'outline'}
                  onClick={() => setStoryGroupTab('development')}
                  className="h-8 rounded-full px-3"
                >
                  Development
                </Button>
                <Button
                  size="sm"
                  variant={storyGroupTab === 'suggestions' ? 'default' : 'outline'}
                  onClick={() => setStoryGroupTab('suggestions')}
                  className="h-8 rounded-full px-3"
                >
                  Suggestions
                </Button>
                <div className="group relative">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground"
                  >
                    Section
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <div className="pointer-events-none invisible absolute right-0 top-9 z-20 w-[min(88vw,220px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border/70 bg-popover p-1 opacity-0 shadow-lg transition group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setStorySectionFilter('all')}
                      className={cn(
                        'block w-full rounded-lg px-3 py-2 text-left text-xs break-words whitespace-normal',
                        storySectionFilter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                      )}
                    >
                      All sections
                    </button>
                    {sectionFilters.map((section) => (
                      <button
                        key={section}
                        type="button"
                        onClick={() => setStorySectionFilter(section)}
                        className={cn(
                          'mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs break-words whitespace-normal',
                          storySectionFilter === section ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                        )}
                      >
                        {section}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="group relative">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground"
                  >
                    Area
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <div className="pointer-events-none invisible absolute right-0 top-9 z-20 w-[min(88vw,260px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border/70 bg-popover p-1 opacity-0 shadow-lg transition group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setStoryAreaFilter('all')}
                      className={cn(
                        'block w-full rounded-lg px-3 py-2 text-left text-xs break-words whitespace-normal',
                        storyAreaFilter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                      )}
                    >
                      All areas
                    </button>
                    {areaFilters.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setStoryAreaFilter(area)}
                        className={cn(
                          'mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs break-words whitespace-normal',
                          storyAreaFilter === area ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                        )}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {storiesLoading ? (
              <Card className="border-border/70 bg-card/95 p-4 text-sm text-muted-foreground">
                {t('common.loading')}
              </Card>
            ) : null}

            {!storiesLoading && visibleStories.length > 0 ? (
              <Card className="border-border/70 bg-card/95 p-2 shadow-sm">
                <ul className="divide-y divide-border/60">
                  {visibleStories.map((story) => {
                    const extraBehaviorLines = behaviorHighlightsBeyondSummary(story);
                    return (
                    <li key={story.id} className="py-1 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => setSelectedStoryId((prev) => (prev === story.id ? null : story.id))}
                        className={cn(
                          'group w-full rounded-lg border border-border/70 p-3 text-left shadow-sm transition-all',
                          'cursor-pointer bg-card/95 hover:border-border hover:shadow-md active:border-border active:bg-card/90',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          selectedStoryId === story.id && 'border-primary/40 bg-primary/5 shadow-md',
                        )}
                      >
                        <div className="flex w-full items-start gap-2">
                          <span
                            className={cn(
                              'mt-0.5 text-xs font-semibold text-muted-foreground transition-colors',
                              'group-hover:text-foreground',
                              selectedStoryId === story.id && 'text-foreground',
                            )}
                          >
                            •
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'text-sm font-semibold text-muted-foreground transition-colors',
                                'group-hover:text-foreground',
                                selectedStoryId === story.id && 'text-foreground',
                              )}
                            >
                              {story.featureTitle}
                            </p>
                            {extraBehaviorLines[0] ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground/90">
                                {extraBehaviorLines[0]}
                              </p>
                            ) : story.behaviorHighlights[0] &&
                              buildReaderFacingSummary(story) !== story.featureTitle ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground/90">
                                {buildReaderFacingSummary(story)}
                              </p>
                            ) : null}
                          </div>
                          {story.relatedCount > 1 ? (
                            <span className="ml-auto shrink-0 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {story.relatedCount} updates
                            </span>
                          ) : null}
                        </div>
                      </button>

                      {selectedStoryId === story.id ? (
                        <div className="mt-2 rounded-xl border border-border/60 bg-card p-3">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{story.section}</Badge>
                            <Badge variant="outline">{story.area}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(story.requestedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="mb-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-foreground">{buildReaderFacingSummary(story)}</p>
                          </div>
                          {extraBehaviorLines.length > 0 ? (
                            <div className="mb-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Behavior and refinements
                              </p>
                              <ul className="mt-2 space-y-2 text-sm text-foreground">
                                {extraBehaviorLines.map((line, idx) => (
                                  <li key={idx} className="leading-snug">
                                    {line}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {rephrasedAddsUniqueDetail(story) ? (
                            <p className="text-sm text-muted-foreground">{story.rephrasedDescription}</p>
                          ) : null}
                          {originalInstructionAddsUniqueDetail(story) ? (
                            <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Original instruction</p>
                              <p className="mt-1 text-sm text-foreground">{story.originalInstruction}</p>
                            </div>
                          ) : null}
                          {story.createdFeatures.some(
                            (f) => f.trim() && !/backfilled from chat transcript|chat transcript/i.test(f),
                          ) ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created components and features</p>
                            <ul className="mt-1 space-y-1 text-sm text-foreground">
                              {story.createdFeatures
                                .filter((f) => f.trim() && !/backfilled from chat transcript|chat transcript/i.test(f))
                                .map((feature) => (
                                <li key={feature}>- {feature}</li>
                              ))}
                            </ul>
                          </div>
                          ) : null}
                          {expectedBehaviorAddsUniqueDetail(story) ? (
                            <div className="mt-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Purpose and expected behavior
                              </p>
                              <p className="mt-1 text-sm text-foreground">{story.expectedBehavior}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                  })}
                </ul>
              </Card>
            ) : null}

            {!storiesLoading && visibleStories.length === 0 ? (
              <Card className="border-2 border-dashed border-border/70 bg-card/70 p-6 text-sm text-muted-foreground">
                {storyGroupTab === 'suggestions'
                  ? 'No suggestion stories yet for the selected filters.'
                  : 'No stories match the selected filters.'}
              </Card>
            ) : null}
          </motion.div>
        ) : null}

        {/* Recent Endorsements */}
        {showRecentEndorsements ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
          <h2 className="mb-3 text-lg font-semibold text-foreground">{t('home.recentActivity')}</h2>
          {recentEndorsements.length === 0 ? (
            <Card className="p-6 text-center">
              <Star className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="font-medium text-foreground">{t('home.noActivityYet')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('home.activityBuildingHint')}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/profile')}>
                  <Briefcase className="h-3.5 w-3.5" />
                  {t('home.addExperience')}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/profile')}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('home.addSkill')}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/profile')}>
                  <Users className="h-3.5 w-3.5" />
                  {t('home.addContribution')}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => navigate('/profile')}>
                  {t('home.addQualification')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate('/endorse/select')}>
                  {t('home.requestEndorsement')}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentEndorsements.map((endorsement, index) => (
                <motion.div
                  key={endorsement.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={endorsement.endorser?.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                          {getInitials(endorsement.endorser?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          {t('home.endorsedYouOn', {
                            person: endorsement.endorser?.full_name || t('home.someone'),
                            pillar: getPillarName(endorsement.pillar),
                          })}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < endorsement.stars
                                  ? 'fill-accent text-accent'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                          {endorsement.comment && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              "{endorsement.comment}"
                            </p>
                          )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          </motion.div>
        ) : null}
      </div>

      <HomeRepostThoughtsDialog
        open={Boolean(thoughtsOriginal)}
        onOpenChange={(open) => {
          if (!open) setThoughtsOriginal(null);
        }}
        activeName={activeIdentityLabel}
        activeAvatarUrl={profile?.avatar_url}
        postingAsLabel={t('home.postingAs')}
        title={t('home.repostWithThoughts')}
        placeholder={t('home.repostThoughtsPlaceholder')}
        cancelLabel={t('common.cancel')}
        postLabel={t('home.post')}
        postingLabel={t('home.posting')}
        originalBadgeLabel={t('home.originalPost')}
        unavailableLabel={t('home.originalPostUnavailable')}
        seeFullLabel={t('home.seeFullPost')}
        original={thoughtsOriginal}
        onSubmit={async (commentary) => {
          try {
            await handleRepostWithThoughts(commentary);
          } catch (error) {
            console.error('Error creating repost with thoughts:', error);
            toast.error(t('home.couldNotRepost'), {
              description: t('common.tryAgainMoment'),
            });
            throw error;
          }
        }}
        onOpenOriginal={() => {
          if (thoughtsOriginal) setFullOriginal(thoughtsOriginal);
        }}
      />

      <Dialog
        open={Boolean(fullOriginal)}
        onOpenChange={(open) => {
          if (!open) setFullOriginal(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('home.originalPost')}</DialogTitle>
          </DialogHeader>
          {fullOriginal ? <HomeFullOriginalBody original={fullOriginal} /> : null}
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
