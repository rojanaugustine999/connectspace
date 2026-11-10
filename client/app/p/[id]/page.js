"use client";

// A single post with its comments: /p/<mongo id>
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import PostCard from "@/components/PostCard";
import CommentSection from "@/components/CommentSection";

export default function PostPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [post, setPost] = useState(null);
  const [commentCount, setCommentCount] = useState(0);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (authLoading) return;
    api(`/api/posts/${id}`)
      .then(({ post }) => {
        setPost(post);
        setCommentCount(post.commentCount);
        setStatus("ready");
      })
      .catch((err) => setStatus(err.status === 404 ? "notfound" : "error"));
  }, [id, authLoading, user?.id]);

  if (status === "loading") return <p className="p-8 text-center opacity-60">Loading post…</p>;
  if (status === "notfound") {
    return (
      <main className="p-8 text-center">
        <h1 className="text-xl font-bold">Post not found</h1>
        <p className="mt-2 opacity-70">It may have been deleted.</p>
        <Link href="/" className="mt-4 inline-block underline">
          Go home
        </Link>
      </main>
    );
  }
  if (status === "error") return <p className="p-8 text-center text-red-600">Could not load this post.</p>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-4 font-sans">
      <button onClick={() => router.back()} className="text-sm opacity-70 hover:underline">
        ← Back
      </button>
      <PostCard
        key={post.id + String(post.likedByMe)}
        post={post}
        linkToPost={false}
        commentCount={commentCount}
        onDeleted={() => router.push(`/u/${post.author.username}`)}
      />
      <CommentSection postId={post.id} onCountChange={setCommentCount} viewerKey={user?.id} />
    </main>
  );
}
