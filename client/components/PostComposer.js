"use client";

// Write a new post (text + up to 4 photos).
//   1. Each photo uploads as soon as you pick it: POST /api/uploads/image → url
//   2. "Post" sends the text + those urls: POST /api/posts (or /api/groups/:slug/posts)
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/upload";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/Avatar";
import MentionField from "@/components/MentionField";

const MAX = 2000;
const MAX_IMAGES = 4;

export default function PostComposer({ onCreated, endpoint = "/api/posts", placeholder = "What's on your mind?" }) {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]); // { id, preview, url?, error? }
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  if (!user) return null;

  const uploading = images.some((i) => !i.url && !i.error);
  const remaining = MAX - content.length;
  const canPost = (content.trim().length > 0 || images.some((i) => i.url)) && remaining >= 0 && !posting && !uploading;

  async function pickImages(e) {
    const files = [...e.target.files].slice(0, MAX_IMAGES - images.length);
    e.target.value = ""; // so picking the same file again still triggers onChange
    for (const file of files) {
      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file); // instant local preview while it uploads
      setImages((prev) => [...prev, { id, preview }]);
      uploadImage(file, "posts")
        .then((url) => setImages((prev) => prev.map((i) => (i.id === id ? { ...i, url } : i))))
        .catch((err) => setImages((prev) => prev.map((i) => (i.id === id ? { ...i, error: err.message } : i))));
    }
  }

  function removeImage(id) {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview); // free the browser memory used by the preview
      return prev.filter((i) => i.id !== id);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canPost) return;
    setPosting(true);
    setError("");
    try {
      const urls = images.filter((i) => i.url).map((i) => i.url);
      // The API requires text, so a photo-only post gets a small default caption.
      const text = content.trim() || "📷";
      const { post } = await api(endpoint, { method: "POST", body: { content: text, ...(urls.length && { images: urls }) } });
      setContent("");
      images.forEach((i) => URL.revokeObjectURL(i.preview));
      setImages([]);
      onCreated?.(post);
    } catch (err) {
      setError(err.details?.content || err.details?.images || err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 rounded-xl border border-line p-4">
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <label htmlFor="new-post" className="sr-only">
          New post
        </label>
        <MentionField
          as="textarea"
          id="new-post"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(e); // Ctrl+Enter posts
          }}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent text-lg outline-none placeholder:opacity-50"
        />

        {images.length > 0 && (
          <ul className="mt-2 grid grid-cols-4 gap-2">
            {images.map((img) => (
              <li key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className={`size-full object-cover ${img.url ? "" : "opacity-50"}`} />
                {!img.url && !img.error && (
                  <span className="absolute inset-0 grid place-items-center text-xs font-medium">Uploading…</span>
                )}
                {img.error && (
                  <span className="absolute inset-0 grid place-items-center bg-red-600/80 p-1 text-center text-[11px] text-white">
                    {img.error}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/70 text-sm text-white hover:bg-black"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        <div className="mt-2 flex items-center justify-end gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={pickImages}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            disabled={images.length >= MAX_IMAGES}
            className="mr-auto rounded-full px-3 py-1.5 text-sm font-medium text-link hover:bg-brand/10 disabled:opacity-40"
          >
            📷 Photo{images.length > 0 && ` (${images.length}/${MAX_IMAGES})`}
          </button>
          {content.length > MAX - 200 && (
            <span className={`text-sm ${remaining < 0 ? "text-danger" : "opacity-60"}`}>{remaining}</span>
          )}
          <button
            type="submit"
            disabled={!canPost}
            className="rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-hover disabled:opacity-40"
          >
            {posting ? "Posting…" : uploading ? "Uploading…" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}
