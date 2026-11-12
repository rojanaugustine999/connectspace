"use client";

// Comments for one post: list (as a tree), add, reply, delete.
//   GET    /api/posts/:id/comments
//   POST   /api/posts/:id/comments            { content, parentId? }
//   DELETE /api/posts/:id/comments/:commentId
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { timeAgo } from "@/lib/format";
import Avatar from "@/components/Avatar";

function CommentForm({ postId, parentId, onAdded, autoFocus, placeholder, onCancel }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setError("");
    try {
      const result = await api(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: { content, ...(parentId && { parentId }) },
      });
      setContent("");
      onAdded(result);
    } catch (err) {
      setError(err.details?.content || err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1">
      <label htmlFor={`comment-${parentId ?? "new"}`} className="sr-only">
        {placeholder}
      </label>
      <div className="flex gap-2">
        <input
          id={`comment-${parentId ?? "new"}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={1000}
          className="min-w-0 flex-1 rounded-full border border-line-strong bg-transparent px-4 py-2 outline-none focus:ring-2 focus:ring-brand/40"
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-40"
        >
          {sending ? "…" : parentId ? "Reply" : "Comment"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-2 text-sm opacity-60 hover:opacity-100">
            Cancel
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </form>
  );
}

function Comment({ comment, postId, isReply, canReply, onReplyAdded, onDelete }) {
  const [replying, setReplying] = useState(false);

  return (
    <div className="flex gap-3">
      <Link href={`/u/${comment.author.username}`} className="shrink-0">
        <Avatar user={comment.author} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-subtle px-3 py-2">
          <Link href={`/u/${comment.author.username}`} className="text-sm font-semibold hover:underline">
            {comment.author.name}
          </Link>
          <p className="whitespace-pre-line break-words">{comment.content}</p>
        </div>
        <div className="mt-1 flex gap-3 px-3 text-xs">
          <time dateTime={comment.createdAt} className="opacity-60">
            {timeAgo(comment.createdAt)}
          </time>
          {canReply && (
            <button onClick={() => setReplying(true)} className="font-semibold opacity-70 hover:opacity-100">
              Reply
            </button>
          )}
          {comment.canDelete && (
            <button
              onClick={() => onDelete(comment)}
              className="font-semibold opacity-70 hover:text-danger hover:opacity-100"
            >
              Delete
            </button>
          )}
        </div>

        {!isReply && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((r) => (
              <Comment key={r.id} comment={r} postId={postId} isReply canReply={false} onDelete={onDelete} />
            ))}
          </div>
        )}

        {replying && (
          <div className="mt-3">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              autoFocus
              placeholder={`Reply to ${comment.author.name}`}
              onCancel={() => setReplying(false)}
              onAdded={(result) => {
                onReplyAdded(comment.id, result);
                setReplying(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommentSection({ postId, onCountChange, viewerKey }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/posts/${postId}/comments`)
      .then((d) => setComments(d.comments))
      .catch((err) => setError(err.message));
  }, [postId, viewerKey]);

  function addTopLevel({ comment, commentCount }) {
    setComments((prev) => [...prev, comment]);
    onCountChange(commentCount);
  }

  function addReply(parentId, { comment, commentCount }) {
    setComments((prev) => prev.map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, comment] } : c)));
    onCountChange(commentCount);
  }

  async function handleDelete(comment) {
    const extra = comment.replies?.length ? ` and its ${comment.replies.length} repl${comment.replies.length === 1 ? "y" : "ies"}` : "";
    if (!window.confirm(`Delete this comment${extra}?`)) return;
    try {
      const { commentCount } = await api(`/api/posts/${postId}/comments/${comment.id}`, { method: "DELETE" });
      setComments((prev) =>
        prev
          .filter((c) => c.id !== comment.id)
          .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== comment.id) }))
      );
      onCountChange(commentCount);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <section aria-label="Comments" className="mt-2 border-t border-line pt-6">
      {user ? (
        <div className="flex gap-3">
          <Avatar user={user} size="sm" />
          <CommentForm postId={postId} onAdded={addTopLevel} placeholder="Write a comment…" />
        </div>
      ) : (
        <p className="text-sm opacity-70">
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>{" "}
          to comment.
        </p>
      )}

      {error && <p className="mt-6 text-danger">{error}</p>}
      {!comments && !error && <p className="mt-6 opacity-60">Loading comments…</p>}
      {comments?.length === 0 && <p className="mt-6 text-center text-sm opacity-60">No comments yet. Be the first!</p>}

      <div className="mt-6 space-y-5">
        {comments?.map((c) => (
          <Comment
            key={c.id}
            comment={c}
            postId={postId}
            canReply={Boolean(user)}
            onReplyAdded={addReply}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </section>
  );
}
