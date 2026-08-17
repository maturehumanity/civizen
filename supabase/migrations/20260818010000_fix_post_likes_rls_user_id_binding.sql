-- Fix post_likes RLS: unqualified `user_id` inside `FROM profiles` bound to
-- profiles.user_id, producing `profiles.id = profiles.user_id` (almost never true).
-- Likes then failed WITH CHECK / USING even when has_permission('like.create') was true.
-- Qualify as post_likes.user_id so the inserted/deleted row is the ownership check.

DROP POLICY IF EXISTS "Authenticated users can create post likes" ON public.post_likes;
CREATE POLICY "Authenticated users can create post likes" ON public.post_likes
  FOR INSERT WITH CHECK (
    public.has_permission('like.create'::public.app_permission)
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = post_likes.user_id
        AND profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can remove their own post likes" ON public.post_likes;
CREATE POLICY "Users can remove their own post likes" ON public.post_likes
  FOR DELETE USING (
    public.has_permission('like.delete_self'::public.app_permission)
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = post_likes.user_id
        AND profiles.user_id = auth.uid()
    )
  );
