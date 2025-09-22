"use client";

import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthState } from "@/hooks/useAuthState";
import { LibraryHistory } from "./LibraryHistory";
import ReactMarkdown from "react-markdown";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { SignInButton as ClerkSignInButton } from "@clerk/nextjs";
import { useSettings } from "@/hooks/useSettings";
import { useRouter } from "next/navigation";
import { SubscriptionCard } from "@/components/storySuggestions/SubscriptionCard";

interface LeftSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export function LeftSidebar({ isOpen = true, onClose, isMobile = false }: LeftSidebarProps) {
  const { isAnonymous, displayName, isLoaded, authArgs } = useAuthState();
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [analysisMarkdown, setAnalysisMarkdown] = useState<string | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [isPasteMode, setIsPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const analyzeImportedText = useAction(api.customContent.actions.analyzeImportedText);
  const { settings } = useSettings();
  const router = useRouter();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const showAnon = mounted && isLoaded && isAnonymous && !!displayName;

  // Import helpers (mobile-only usage)
  const MAX_IMPORT_BYTES = 200_000;

  const readFileAsText = useCallback(async (file: File): Promise<string> => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let truncated = bytes;
    if (bytes.byteLength > MAX_IMPORT_BYTES) {
      truncated = bytes.slice(0, MAX_IMPORT_BYTES);
      setWarning(`Large file detected. Imported first ${(MAX_IMPORT_BYTES / 1000).toFixed(0)}KB of text.`);
    } else {
      setWarning(null);
    }
    const lower = file.name.toLowerCase();
    if (/\.(pdf|docx?)$/.test(lower)) {
      setWarning(prev => (prev ? `${prev} Also detected ${lower.endsWith('pdf') ? 'PDF' : 'Word'} file; best-effort text extraction in browser.` : `Detected ${lower.endsWith('pdf') ? 'PDF' : 'Word'} file; best-effort text extraction in browser.`));
    }
    const decoder = new TextDecoder();
    return decoder.decode(truncated);
  }, []);

  const normalizeText = useCallback((text: string): string => {
    const normalized = text.replace(/\r\n?/g, "\n");
    if (normalized.length > MAX_IMPORT_BYTES) {
      setWarning(`Input exceeded limit. Truncated to ${(MAX_IMPORT_BYTES / 1000).toFixed(0)}KB.`);
      return normalized.slice(0, MAX_IMPORT_BYTES);
    }
    return normalized;
  }, []);

  const handleAnalyzeText = useCallback(async (raw: string) => {
    if (!authArgs) return;
    const text = normalizeText(raw);
    setIsAnalyzing(true);
    setAnalysisMarkdown(null);
    try {
      const md = await analyzeImportedText({
        ...(authArgs as any),
        text,
        preferredGenre: settings.genre,
        playerMode: settings.storyStructure === "player",
      } as any);
      setAnalysisMarkdown(md as unknown as string);
      setShowProfileDialog(true);
    } catch (_e) {
      setWarning("Failed to analyze imported text. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeImportedText, authArgs, normalizeText, settings]);

  const onSelectFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await readFileAsText(file);
    await handleAnalyzeText(text);
    e.target.value = "";
  }, [readFileAsText, handleAnalyzeText]);

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-stone-950/30 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          ${isMobile ? "fixed inset-y-0 left-0 z-50 w-80 bg-stone-900/10 backdrop-blur-xl overflow-y-auto" : "relative w-full"}
          ${isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"}
          transition-transform duration-300 ease-in-out
          flex flex-col h-full
        `}
      >
        {/* Top Section */}
        <div className="flex-none">
          {/* Mobile header: close + anon */}
          {isMobile && (
            <div className="px-4 py-3 flex justify-between items-center">
              {showAnon ? (
                <div className="flex items-center">
                  <span className="text-sm text-amber-50/70">
                    Welcome <span className="text-amber-50/90 font-medium">{displayName}</span>
                  </span>
                </div>
              ) : (
                <div />
              )}

              <button
                onClick={onClose}
                className="md:hidden p-3.5 hover:bg-amber-100/10 transition-colors"
                aria-label="Close sidebar"
              >
                <svg
                  className="w-5 h-5 text-amber-100"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Desktop anon badge */}
          {!isMobile && showAnon && (
            <div className="pl-2 pr-6 pt-8 pb-2">
              <div className="w-full flex items-center justify-center">
                <span className="text-md text-amber-50/70">
                  Welcome <span className="text-amber-50/90 font-medium">{displayName}</span>
                </span>
              </div>
            </div>
          )}



        </div>

        {/* Smaller spacer for higher positioning */}
        <div className="flex-none h-4 md:block hidden"></div>

        {/* Subscription Card - positioned higher, no top spacing on mobile */}
        <div className="px-2 pr-6 pt-0 md:pt-2">
          <SubscriptionCard variant="sidebar" />
        </div>

        {/* Bottom Section - Story & Chat History */}
        <div className={isMobile ? "" : "flex-1 min-h-0"}>
          {/* Align with header/subscription card paddings */}
          <div className="h-full pt-4 mt-2 md:pt-12 md:mt-6">
            {/** Renamed to LibraryHistory (stories + chats) */}
            <LibraryHistory />
          </div>
        </div>

        {isMobile && showProfileDialog && analysisMarkdown && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-stone-950/60" onClick={() => setShowProfileDialog(false)} />
            <div className="relative bg-stone-900/80 backdrop-blur-md border border-white/20 w-full max-w-md mx-4 max-h-[80vh] flex flex-col text-white/80">
              <div className="flex items-center justify-between p-3">
                <h3 className="text-white/90 text-base font-semibold">Imported Profile</h3>
                <button type="button" aria-label="Close" onClick={() => setShowProfileDialog(false)} className="text-white/70 hover:text-white">✕</button>
              </div>
              <div className="px-3 pb-3 overflow-auto">
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{analysisMarkdown}</ReactMarkdown>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 border-t border-white/10">
                <UpdateSettingsButtonMobile markdown={analysisMarkdown} onDone={() => setShowProfileDialog(false)} />
                <StartStoryFromMarkdownButtonMobile markdown={analysisMarkdown} onDone={() => setShowProfileDialog(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function UpdateSettingsButtonMobile({ markdown, onDone }: { markdown: string; onDone: () => void }) {
  const { authArgs } = useAuthState();
  const updateSettings = useMutation(api.users.preferences.updateStorySettings);

  const parsed = useMemo(() => {
    const genreMatch = markdown.match(/^##\s*Genre[\s\S]*?\n([^#\n].*)/m);
    const genre = genreMatch ? genreMatch[1].trim().toLowerCase() : undefined;
    const tagsSection = markdown.match(/^##\s*Tags[\s\S]*?\n([^#]+)/m);
    const tags = tagsSection ? tagsSection[1].split(/,|\n/).map(t => t.trim()).filter(Boolean).slice(0, 12) : undefined;
    return { genre, tags };
  }, [markdown]);

  const onClick = useCallback(async () => {
    if (!authArgs) return;
    try {
      await updateSettings({ ...(authArgs as any), genre: parsed.genre, selectedTags: parsed.tags });
    } finally {
      onDone();
    }
  }, [updateSettings, authArgs, parsed, onDone]);

  return (
    <button type="button" onClick={onClick} className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm">
      Update FromYou Settings
    </button>
  );
}

function StartStoryFromMarkdownButtonMobile({ markdown, onDone }: { markdown: string; onDone: () => void }) {
  const { authArgs } = useAuthState();
  const { settings } = useSettings();
  const saveSuggestion = useMutation(api.stories.mutations.saveSuggestion);
  const createStory = useMutation(api.stories.index.createStory);
  const router = useRouter();

  const extractCharacters = (md: string): { main: string[]; side: string[] } => {
    const sectionMatch = md.match(/^##\s*Characters[\s\S]*?(?=^##\s|\Z)/m);
    if (!sectionMatch) return { main: [], side: [] };
    const lines = sectionMatch[0].split('\n').slice(1).map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
    return { main: lines.slice(0, 2).map(stripName), side: lines.slice(2).map(stripName) };
  };
  const stripName = (s: string) => s.replace(/^(\*\*|__)?([^:*—-]+)(\*\*|__)?[:—-]?.*$/u, '$2').trim();

  const extractGenre = (md: string) => {
    const m = md.match(/^##\s*Genre[\s\S]*?\n([^#\n].*)/m);
    return m ? m[1].trim().toLowerCase() : settings.genre.toLowerCase();
  };
  const extractTags = (md: string) => {
    const m = md.match(/^##\s*Tags[\s\S]*?\n([^#]+)/m);
    return m ? m[1].split(/,|\n/).map(t => t.trim()).filter(Boolean).slice(0, 12) : [];
  };
  const extractPremise = (md: string) => {
    const pages = md.match(/^##\s*Story Pages[\s\S]*?(?=^##\s|\Z)/m)?.[0] || '';
    const first = pages.split('\n').slice(1).join(' ').trim();
    if (first) return first.slice(0, 400);
    const other = md.match(/^##\s*Other Notes[\s\S]*?(?=^##\s|\Z)/m)?.[0] || '';
    return other.slice(0, 400) || 'Imported story prompt';
  };

  const onClick = useCallback(async () => {
    if (!authArgs) return;
    const chars = extractCharacters(markdown);
    const genre = extractGenre(markdown);
    const premise = extractPremise(markdown);
    const allCharacters = [...chars.main, ...chars.side];
    const suggestionId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    try {
      await saveSuggestion({
        ...(authArgs as any),
        suggestionId,
        text: premise,
        characters: { main_characters: chars.main, side_characters: chars.side },
        metadata: {
          characters: allCharacters,
          sources: ["Custom"],
          primarySource: "Custom",
          genre,
          storyType: 'custom',
          playerMode: settings.storyStructure === 'player',
          characterCount: settings.characterCount,
        },
      } as any);

      const storyId = await createStory({
        ...(authArgs as any),
        suggestionId,
        suggestion: {
          text: premise,
          characters: { main_characters: chars.main, side_characters: chars.side },
          metadata: {
            characters: allCharacters,
            sources: ["Custom"],
            primarySource: "Custom",
            genre,
            storyType: 'custom',
            playerMode: settings.storyStructure === 'player',
            characterCount: settings.characterCount,
          },
        },
        selectedCharacters: allCharacters,
      } as any);

      router.push(`/s/${storyId}`);
    } finally {
      onDone();
    }
  }, [authArgs, markdown, settings, saveSuggestion, createStory, router]);

  return (
    <button type="button" onClick={onClick} className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-100 text-sm">
      Start Story
    </button>
  );
}