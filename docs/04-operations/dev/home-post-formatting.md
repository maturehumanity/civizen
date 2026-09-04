# Home posts — formatting and editing

Working product note for the Home/Postings composer. Editorial authorship (Civizen vs personal) remains in [`home-repost-editorial.md`](./home-repost-editorial.md).

Ordinary social posts are not formal civic records. Votes, decisions, signed documents, and evidence submissions may later have separate locking rules; those rules do not apply here.

## Formatting

The Home composer uses the same `contentEditable` + `document.execCommand` path as Agreements, with a restrained social toolbar:

- Bold, Italic, Underline
- Bulleted list, Numbered list
- Line spacing (Tight / Default / Relaxed)

Document controls (font, color, size, alignment) stay on Agreements only.

Supported markup is sanitized with the shared walker in `src/lib/sanitize-user-html.ts` and the post allowlist in `src/lib/posts-html.ts`. Render always sanitizes. Historical plain-text posts still render as plain text.

## Editing

Authorized authors (current profile = `posts.author_id`, including an organization/page after account switch) may edit published post content indefinitely.

- UI: post ⋯ → pencil (Edit post) / trash (Delete post); names on hover, accessible labels for tap. Shown for the owner regardless of post age.
- Edit opens **on that post card** (same restrained toolbar; Save changes / Cancel). The new-post composer stays for new posts.
- Save uses `edit_published_post`
- Backend RLS and the RPC enforce ownership and `post.edit_self`; they do not impose a time limit
- Original `created_at` stays the publication time
- `edited_at` / `is_edited` are set only when published `content` changes
- **Edited** appears next to the time after an actual content change
- Previous wording is stored in `post_revisions` (internal; no public history in this phase)
- Comments, reactions, reposts, visibility, and ownership are not altered by an edit
