"use client";

// Account menu on the avatar in the nav: View profile, Edit profile, Log out.
// Follows the WAI-ARIA "menu button" pattern:
//   - the avatar is a <button> with aria-haspopup + aria-expanded
//   - Enter/Space/↓ opens it and focuses the first item; ↑/↓/Home/End move between items
//   - Escape closes it and puts focus back on the avatar; clicking outside or Tab also closes it
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/Avatar";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const items = () => [...(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])];
  const focusItem = (index) => {
    const list = items();
    list[(index + list.length) % list.length]?.focus();
  };

  function close({ returnFocus = false } = {}) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  // When the menu opens with the keyboard, focus the first item.
  const openWithKeyboard = useRef(false);
  useEffect(() => {
    if (open && openWithKeyboard.current) menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    openWithKeyboard.current = false;
  }, [open]);

  // Close when clicking or tapping anywhere outside the menu.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!user) return null;

  function onButtonKeyDown(e) {
    if (["Enter", " ", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      openWithKeyboard.current = true;
      setOpen(true);
    }
  }

  function onMenuKeyDown(e) {
    const list = items();
    const index = list.indexOf(document.activeElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(index + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(list.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close({ returnFocus: true });
        break;
      case "Tab":
        close(); // let focus move on naturally
        break;
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout(); // POST /api/auth/logout clears the cookie; the socket disconnects because user becomes null
    } finally {
      setLoggingOut(false);
      close();
      router.push("/");
    }
  }

  const itemClass =
    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-black/5 focus:bg-black/5 focus:outline-none dark:hover:bg-white/10 dark:focus:bg-white/10";

  return (
    <div className="relative ml-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Account menu"
        className="block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <Avatar user={user} size="sm" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-xl border border-black/10 bg-background py-1 shadow-lg dark:border-white/15"
        >
          <div className="flex items-center gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10" role="none">
            <Avatar user={user} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs opacity-60">@{user.username}</p>
            </div>
          </div>

          <Link role="menuitem" href={`/u/${user.username}`} onClick={() => close()} className={itemClass}>
            <MenuIcon d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            View profile
          </Link>
          <Link role="menuitem" href="/settings/profile" onClick={() => close()} className={itemClass}>
            <MenuIcon d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            Edit profile
          </Link>

          <div className="my-1 border-t border-black/10 dark:border-white/10" role="separator" />

          <button
            role="menuitem"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className={`${itemClass} text-red-600 disabled:opacity-60 dark:text-red-400`}
          >
            <MenuIcon d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h11" />
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuIcon({ d }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
