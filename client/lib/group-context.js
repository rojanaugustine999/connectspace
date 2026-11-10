"use client";

// The group loaded by app/groups/[slug]/layout.js, shared with its child pages.
// (Next.js only allows specific exports from layout files, so the context lives here.)
import { createContext, useContext } from "react";

export const GroupContext = createContext(null);
export const useGroup = () => useContext(GroupContext);
