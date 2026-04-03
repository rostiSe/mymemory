# Concept — MyMemory

## What it is
MyMemory is a minimalistic, AI-powered second brain app for Android. It lets you save anything — articles, videos, images, tweets, PDFs, quick notes — directly from any app via Android's share menu. Every saved item is automatically analyzed, summarized, tagged, and categorized by AI. It's a low-friction bookmark manager and knowledge capture tool with semantic search and periodic digests of what you've been learning.

## The problem it solves
You come across interesting content all day — articles, videos, ideas — but there's no fast way to capture and organize it without breaking your flow. Existing tools require manual tagging, categorizing, or switching apps. MyMemory eliminates that friction: share from any app, and AI handles the rest. Later, you can search semantically ("that article about React rendering"), browse by auto-generated spaces, or get AI digests of what you've been consuming.

## Platform
- Android first (dev client required for share intent)
- iOS and web can be added later (Expo universal)
- Key device capabilities: Android share intent (receive shared content from other apps)

## Core entities
- **Entry** — any piece of saved content (article, image, video, note, bookmark, PDF, tweet) with AI-generated metadata
- **Tag** — AI-generated or user-assigned labels for entries
- **Topic** — broader subject areas extracted from content (e.g., "Machine Learning", "React Native")
- **Space** — organizational groupings (like folders), created manually or suggested by AI based on content clustering
- **Entry Note** — user-written notes attached to any entry
- **Digest** — AI-generated summary of entries over a time period, grouped by topic
- **Embedding** — vector representation of entry content for semantic search

## Primary flows
1. **Share and save** — User reads an article in Chrome, taps Share > MyMemory, sees a compact modal with detected title and type, optionally adds a quick note, taps Save. Entry appears in feed immediately. AI processes it in the background (summarize, tag, categorize).
2. **Quick note** — User opens feed, taps the input bar at the bottom, types/formats a note in the rich text editor, saves. Note is analyzed and categorized like any other entry.
3. **Browse feed** — User scrolls through a minimalistic feed of entry cards showing headline, type indicator, and type-aware preview (article thumbnail, image preview, video thumbnail, etc.).
4. **Read and review** — User taps an entry to see full content, expandable TLDR summary, tags, topics, and their own notes. Marks it as "reviewed" when done.
5. **Semantic search** — User types a natural language query. Online: AI finds semantically similar entries via embeddings. Offline: falls back to text/tag search.
6. **Explore spaces** — User browses auto-organized spaces (e.g., "Development", "Design", "Health") or creates their own. Spaces can have subspaces. Search within a space is scoped.
7. **Digest** — User generates a digest for a time period (e.g., "last week"). AI summarizes entries grouped by topic, showing what the user was learning about.
8. **Auto-digest** — User configures a weekly cron job in settings. Every Monday at 9am, a digest of the past week is generated automatically.

## What it is NOT
- Not a read-it-later app (though it can function as one) — the focus is capture and organization, not reading experience
- Not a note-taking app (though it supports notes) — the primary input is shared external content, notes are supplementary
- Not a social platform — single user, private knowledge base
- Not a Notion replacement — it's a lightweight capture layer that can feed into a larger system later
- Not an AI chatbot — AI works behind the scenes to organize, not as a conversational interface

## Open questions
1. **Image handling** — Should images shared directly (not URLs) be stored in Supabase Storage or an external service like Cloudflare R2? Storage costs and bandwidth to consider.
2. **Video content** — For YouTube links, should we extract transcripts (when available) or just store metadata + thumbnail? Transcripts enable better summarization but add processing time.
3. **Space suggestion threshold** — How many unassigned entries should accumulate before the AI suggests a new space? Starting with 5+ seems reasonable but needs user testing.
4. **Digest format** — Should digests be simple markdown summaries or more structured (cards per topic, linked entries, learning insights)?
5. **Rate limiting** — How to handle bursts of shared content (e.g., user shares 20 articles in a row) without overwhelming the AI pipeline or hitting OpenAI rate limits?
