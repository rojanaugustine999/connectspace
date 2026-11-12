"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import RichText from "@/components/RichText";
import { optimizedImage } from "@/lib/image";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import Avatar from "@/components/Avatar";
import LikeButton from "@/components/LikeButton";
import MentionField from "@/components/MentionField";

// A post photo plus, when it has a description, an "ALT" badge that shows the description to
// sighted readers too (screen readers already hear it as the photo's alt text).
function PostPhoto({ description, children }) {
  const [open, setOpen] = useState(false);
  if (!description) return children;
  return (
    <div className="relative">
      {children}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Hide photo description" : "Show photo description"}
        className="absolute bottom-2 left-2 z-10 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        ALT
      </button>
      {open && (
        <p className="absolute inset-x-0 bottom-0 max-h-full overflow-auto bg-black/80 p-3 pl-14 text-sm text-white">
          {description}
        </p>
      )}
    </div>
  );
}

export default function PostCard({ post, onDeleted, linkToPost = true, commentCount, showGroup = true, highlight, priority = false }) {
  const [deleting, setDeleting] = useState(false);
  const comments = commentCount ?? post.commentCount;
  const postUrl = `/p/${post.id}`;

  // Editing (author only): the text is swapped for a box, Save sends PATCH /api/posts/:id.
  const [content, setContent] = useState(post.content);
  const [editedAt, setEditedAt] = useState(post.editedAt ?? null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const editButtonRef = useRef(null);

  function startEditing() {
    setDraft(content);
    setEditError("");
    setEditing(true);
  }
  function stopEditing() {
    setEditing(false);
    requestAnimationFrame(() => editButtonRef.current?.focus()); // keyboard users land back where they were
  }
  async function saveEdit(e) {
    e?.preventDefault();
    if (!draft.trim() || saving) return;
    setSaving(true);
    setEditError("");
    try {
      const { post: saved } = await api(`/api/posts/${post.id}`, { method: "PATCH", body: { content: draft } });
      setContent(saved.content);
      setEditedAt(saved.editedAt);
      stopEditing();
    } catch (err) {
      setEditError(err.details?.content || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      onDeleted?.(post.id);
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  }

  return (
    <article className={`flex gap-3 py-4 ${deleting ? "opacity-40" : ""}`}>
      {/* The name link next to it goes to the same profile, so the avatar is skipped by keyboard and screen readers. */}
      <Link href={`/u/${post.author.username}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
        <Avatar user={post.author} />
      </Link>

      <div className="min-w-0 flex-1">
        <header className="flex items-baseline gap-1.5 text-sm">
          <Link href={`/u/${post.author.username}`} className="truncate font-semibold hover:underline">
            {post.author.name}
          </Link>
          <span className="truncate opacity-60">@{post.author.username}</span>
          <span className="opacity-40" aria-hidden>
            ·
          </span>
          {linkToPost ? (
            <Link href={postUrl} className="shrink-0 opacity-60 hover:underline">
              <time dateTime={post.createdAt} suppressHydrationWarning>
                {timeAgo(post.createdAt)}
              </time>
            </Link>
          ) : (
            <time dateTime={post.createdAt} className="shrink-0 opacity-60" suppressHydrationWarning>
              {timeAgo(post.createdAt)}
            </time>
          )}
          {editedAt && (
            <span className="shrink-0 opacity-60" title={`Edited ${timeAgo(editedAt)}`} suppressHydrationWarning>
              · edited
            </span>
          )}
        </header>

        {post.group && showGroup && (
          <Link href={`/groups/${post.group.slug}`} className="text-xs font-medium text-link hover:underline">
            in {post.group.name}
          </Link>
        )}

        {editing ? (
          <form onSubmit={saveEdit} className="mt-2">
            <MentionField
              as="textarea"
              aria-label="Edit post"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") stopEditing();
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveEdit(e); // Ctrl+Enter saves
              }}
              rows={3}
              maxLength={2000}
              autoFocus
              className="resize-y rounded-lg border border-line-strong bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-brand/40"
            />
            {editError && (
              <p role="alert" className="mt-1 text-sm text-danger">
                {editError}
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                disabled={!draft.trim() || saving}
                className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={stopEditing} className="rounded-full px-3 py-1.5 text-sm opacity-70 hover:bg-subtle hover:opacity-100">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <RichText text={content} className="mt-1" highlight={highlight} />
        )}

        {post.images?.length > 0 && (
          <div className={`mt-2 grid gap-1 overflow-hidden rounded-xl ${post.images.length > 1 ? "grid-cols-2" : ""}`}>
            {post.images.map((src, i) => (
              <PostPhoto key={src} description={post.imageDescriptions?.[i]}>
                <a href={src} target="_blank" rel="noreferrer" className="block bg-subtle">
                  {/* Fixed shapes (4:3 for one photo, squares for several) reserve the space before the
                      photo arrives, so the page doesn't jump. The first post's photo loads first (priority). */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={optimizedImage(src, post.images.length > 1 ? 600 : 1200)}
                    // Let the browser pick the smallest copy that's still sharp: a phone gets ~600px, desktop 1200px.
                    srcSet={[400, 600, 900, 1200].map((w) => `${optimizedImage(src, w)} ${w}w`).join(", ")}
                    sizes={post.images.length > 1 ? "(max-width: 640px) 45vw, 300px" : "(max-width: 640px) 90vw, 600px"}
                    alt={post.imageDescriptions?.[i] || `Photo ${i + 1} of ${post.images.length} by ${post.author.name}`}
                    width={post.images.length > 1 ? 600 : 1200}
                    height={post.images.length > 1 ? 600 : 900}
                    loading={priority && i === 0 ? "eager" : "lazy"}
                    fetchPriority={priority && i === 0 ? "high" : "auto"}
                    className={`h-auto w-full object-cover ${post.images.length > 1 ? "aspect-square" : "aspect-[4/3]"}`}
                  />
                </a>
              </PostPhoto>
            ))}
          </div>
        )}

        <footer className="-ml-3 mt-2 flex items-center gap-1">
          <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} />
          <Link
            href={postUrl}
            aria-label={`Comments, ${comments}`}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm opacity-70 hover:bg-brand/10 hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" strokeLinejoin="round" />
            </svg>
            <span aria-hidden>{comments}</span>
          </Link>
          <div className="ml-auto flex items-center">
            {post.isMine && !editing && (
              <button
                ref={editButtonRef}
                onClick={startEditing}
                className="rounded-full px-3 py-1.5 text-sm opacity-60 hover:bg-subtle hover:opacity-100"
              >
                Edit
              </button>
            )}
            {(post.canDelete ?? post.isMine) && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full px-3 py-1.5 text-sm opacity-60 hover:bg-danger/10 hover:text-danger hover:opacity-100"
              >
                Delete
              </button>
            )}
          </div>
        </footer>
      </div>
    </article>
  );
}
