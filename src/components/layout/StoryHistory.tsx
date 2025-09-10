"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuthState } from "@/hooks/useAuthState";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

interface StoryItem {
  _id: Id<"stories">;
  _creationTime: number;
  title: string;
  characters: string[];
  wordCount: number;
  updatedAt: number;
}

export function StoryHistory() {
  const { isAnonymous, authArgs } = useAuthState();
  const [storyLimit, setStoryLimit] = useState(10);
  const [cursor, setCursor] = useState<any | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [editingId, setEditingId] = useState<Id<"stories"> | null>(null);
  const [tempTitle, setTempTitle] = useState<string>("");
  const [openMenuId, setOpenMenuId] = useState<Id<"stories"> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<"stories"> | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const scrollContainerRef = useRef<any>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  const updateStoryTitle = useMutation(api.stories.mutations.updateStoryTitle);
  const deleteStory = useMutation(api.stories.mutations.deleteStory);

  const historyArgs = authArgs
    ? { ...authArgs, limit: storyLimit, cursor }
    : null;

  const storyPage = useQuery(api.queries.stories.getStoryHistory, historyArgs || "skip") as
    | { items: any[]; nextCursor?: any }
    | undefined;
  const stories = storyPage?.items || [];

  const hasMoreAuthArgs = authArgs
    ? { ...authArgs, currentLimit: storyLimit, cursor }
    : null;

  const hasMore = useQuery(api.queries.stories.hasMoreStories, hasMoreAuthArgs || "skip");

  // Mount effect to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset loading-more state when query updates
  useEffect(() => {
    if (isLoadingMore) setIsLoadingMore(false);
  }, [stories, isLoadingMore]);

  // Close actions menu on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      // Don't close if clicking inside the dropdown menu or menu button
      const target = e.target as HTMLElement;
      if (target.closest('[data-dropdown-menu]') || target.closest('[aria-label="Story actions"]')) {
        return;
      }
      setOpenMenuId(null);
      setConfirmDeleteId(null);
    };
    // Use click instead of mousedown to avoid race conditions
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      setCursor(storyPage?.nextCursor ?? null);
      setStoryLimit((prev) => prev + 10);
    }
  }, [hasMore, isLoadingMore, storyPage?.nextCursor]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    const scrollContainer = scrollContainerRef.current?.getScrollElement();
    
    if (!trigger || !scrollContainer || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      {
        root: scrollContainer,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, loadMore]);

  // Actions
  const startRename = useCallback((story: StoryItem) => {
    setOpenMenuId(null);
    setEditingId(story._id);
    setTempTitle(story.title);
  }, []);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setTempTitle("");
  }, []);

  const commitRename = useCallback(async () => {
    if (!editingId || !authArgs) return;
    
    const title = tempTitle.trim();
    if (!title) return;
    
    try {
      await updateStoryTitle({ ...authArgs, storyId: editingId, title });
    } finally {
      setEditingId(null);
      setTempTitle("");
    }
  }, [editingId, tempTitle, updateStoryTitle, authArgs]);

  const handleDelete = useCallback(async (storyId: Id<"stories">) => {
    if (!authArgs) return;
    
    // First click - show confirmation
    if (confirmDeleteId !== storyId) {
      setConfirmDeleteId(storyId);
      return;
    }
    
    // Second click - actually delete
    try {
      await deleteStory({ ...authArgs, storyId });
      setOpenMenuId(null);
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Failed to delete story:", error);
    }
  }, [deleteStory, authArgs, confirmDeleteId]);

  const handleStoryClick = (storyId: Id<"stories">) => {
    router.push(`/s/${storyId}`);
  };

  return (
    <div className="flex flex-col h-full">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .simplebar-scrollbar::before {
              background-color: rgba(255, 255, 255, 0.3) !important;
              border-radius: 4px !important;
            }
            .simplebar-scrollbar:hover::before {
              background-color: rgba(255, 255, 255, 0.5) !important;
            }
            .simplebar-track.simplebar-vertical,
            .simplebar-track.simplebar-horizontal {
              background: transparent !important;
            }
          `,
        }}
      />

      {/* Header */}
      <div className="pl-2 pr-6 py-3">
        <h3 className="text-base font-semibold text-white/70">Story History</h3>
      </div>

      {/* Story List */}
      <SimpleBar ref={scrollContainerRef} className="flex-1 min-h-0" style={{ height: '100%' }}>
        <div className="pl-2 pb-24">
          {!mounted || (!stories && authArgs) ? (
            // Loading skeleton
            <div className="space-y-0">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="py-5 pr-1 border-b border-white/20">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3.5 bg-white/5 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                  </div>

                </div>
              ))}
            </div>
          ) : !authArgs || stories.length === 0 ? (
           // Empty state (icon and quick box removed)
          <div className="flex flex-col text-left">
            <div className="w-full mx-auto">
              <div className="mb-2">
                {!isAnonymous && (
                  <h3 className="text-base font-semibold text-white/70">No Stories Yet</h3>
                )}
                <p className="text-white/70 text-sm leading-relaxed mt-1">
                  {isAnonymous
                    ? "Create a free account to save your stories."
                    : "Your story adventures await! Create your first tale and watch as your library comes to life."}
                </p>
              </div>
            </div>
          </div>
          ) : (
            <>
              {stories.map((story, index) => (
                <div key={story._id} className="relative">
                  <div
                    onClick={() => {
                      if (!editingId) handleStoryClick(story._id);
                    }}
                    className="group py-5 hover:bg-white/5 transition-colors rounded-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 pr-1">
                        {editingId === story._id ? (
                          <input
                            className="w-full bg-white/10 text-white/90 text-sm rounded px-2 py-1 border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/30"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            autoFocus
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') cancelRename();
                            }}
                          />
                        ) : (
                          <h4 className="text-sm font-medium text-white/70 truncate group-hover:text-white transition-colors">
                            {story.title}
                          </h4>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-white/70">
                          <span className="truncate">
                            {story.characters.slice(0, 3).join(", ")}
                            {story.characters.length > 3 && (
                              <span>{` +${story.characters.length - 3} more`}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) => prev === story._id ? null : story._id);
                            setConfirmDeleteId(null); // Reset confirmation when opening menu
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-white/10 text-white/70"
                          aria-label="Story actions"
                        >
                          ⋯
                        </button>
                      </div>
                    </div>

                    {/* Dropdown menu */}
                    {openMenuId === story._id && (
                      <div
                        data-dropdown-menu
                        className="absolute right-2 top-3 z-40 min-w-[160px] rounded-lg border border-white/15 bg-stone-800/60 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.35)] divide-y divide-white/10"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(story);
                          }}
                          className="w-full flex items-center gap-2 text-left text-sm text-white/80 hover:text-white hover:bg-white/10 px-3 py-2"
                        >
                          <svg className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(story._id);
                          }}
                          className={`w-full flex items-center gap-2 text-left text-sm px-3 py-2 ${
                            confirmDeleteId === story._id 
                              ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 font-medium' 
                              : 'text-rose-300/90 hover:text-rose-200 hover:bg-rose-500/10'
                          }`}
                        >
                          {confirmDeleteId === story._id ? (
                            <>
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              Confirm Delete
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  {index < stories.length - 1 && (
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  )}
                </div>
              ))}

              {/* Infinite scroll trigger */}
              {hasMore && (
                <div 
                  ref={loadMoreTriggerRef}
                  className="py-4 flex justify-center"
                >
                  {isLoadingMore && (
                    <div className="inline-flex items-center gap-2 text-white/60 text-sm">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
                      </svg>
                      Loading more stories...
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </SimpleBar>
    </div>
  );
}