"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import Avatar from "@/components/Avatar";
import LikeButton from "@/components/LikeButton";

export default function PostCard({ post, onDeleted, linkToPost = true, commentCount, showGroup = true }) {
  const [deleting, setDeleting] = useState(false);
  const comments = commentCount ?? post.commentCount;
  const postUrl = `/p/${post.id}`;

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
      <Link href={`/u/${post.author.username}`} className="shrink-0">
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
              <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
            </Link>
          ) : (
            <time dateTime={post.createdAt} className="shrink-0 opacity-60">
              {timeAgo(post.createdAt)}
            </time>
          )}
        </header>

        {post.group && showGroup && (
          <Link href={`/groups/${post.group.slug}`} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
            in {post.group.name}
          </Link>
        )}

        <p className="mt-1 whitespace-pre-line break-words">{post.content}</p>

        {post.images?.length > 0 && (
          <div className={`mt-2 grid gap-1 overflow-hidden rounded-xl ${post.images.length > 1 ? "grid-cols-2" : ""}`}>
            {post.images.map((src, i) => (
              <a key={src} href={src} target="_blank" rel="noreferrer" className="block bg-black/5 dark:bg-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Photo ${i + 1} of ${post.images.length} by ${post.author.name}`}
                  loading="lazy"
                  className={`w-full object-cover ${post.images.length > 1 ? "aspect-square" : "max-h-[28rem]"}`}
                />
              </a>
            ))}
          </div>
        )}

        <footer className="-ml-3 mt-2 flex items-center gap-1">
          <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} />
          <Link
            href={postUrl}
            aria-label={`Comments, ${comments}`}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm opacity-70 hover:bg-blue-500/10 hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" strokeLinejoin="round" />
            </svg>
            <span aria-hidden>{comments}</span>
          </Link>
          {(post.canDelete ?? post.isMine) && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto rounded-full px-3 py-1.5 text-sm opacity-60 hover:bg-red-500/10 hover:text-red-600 hover:opacity-100"
            >
              Delete
            </button>
          )}
        </footer>
      </div>
    </article>
  );
}
