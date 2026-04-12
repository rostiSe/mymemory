# Semantic Search — How It Works

## Overview

mymemory uses **embedding-based semantic search**. Instead of matching keywords, it compares the *meaning* of your query against the meaning of every entry. This is powered by OpenAI's `text-embedding-3-small` model and PostgreSQL's `pgvector` extension.

---

## How Similarity Is Calculated

```mermaid
flowchart TD
    subgraph Ingestion ["Ingestion (happens once per entry)"]
        A["Raw content scraped\n(Jina Reader / Firecrawl)"] --> B["cleanContent()\nGPT-4o-mini removes\nnav, ads, footers"]
        B --> C["readableContent\n(clean article body)"]
        C --> D["generateEmbedding()\nOpenAI text-embedding-3-small"]
        D --> E["1536-dim vector\nstored in embeddings table"]
    end

    subgraph Search ["Search (happens per query)"]
        F["User types query\ne.g. 'react native performance'"] --> G["generateEmbedding()\nsame model as ingestion"]
        G --> H["Query vector\n1536 dimensions"]
        H --> I["pgvector cosine distance\nquery_vec <=> entry_vec"]
        I --> J["similarity = 1 - distance\n0.0 = unrelated, 1.0 = identical"]
        J --> K["Filter: similarity >= 0.3\nSort: highest first\nReturn top 15"]
    end

    E -.->|"compared against"| I
```

### The Math

**Cosine similarity** measures the angle between two vectors, ignoring magnitude:

```
similarity = 1 - cosine_distance(query_vector, entry_vector)

Where cosine_distance = 1 - (A . B) / (||A|| * ||B||)

Result: 0.0 (completely unrelated) to 1.0 (semantically identical)
```

pgvector's `<=>` operator computes cosine distance. We convert to similarity by subtracting from 1.

---

## What Gets Embedded

This is the critical question — **what text produces the vector determines search quality**.

```mermaid
flowchart LR
    subgraph URL_Entry ["URL Entry"]
        U1["Raw scraped markdown\n(50K+ chars, noisy)"] --> U2["cleanContent()\nAI noise removal"]
        U2 --> U3["readableContent\n(article body only)"]
        U3 --> U4["generateEmbedding()"]
    end

    subgraph Note_Entry ["Note Entry"]
        N1["User's raw text\n(no cleaning)"] --> N4["generateEmbedding()"]
    end

    style U3 fill:#d4edda,stroke:#28a745
    style N1 fill:#fff3cd,stroke:#ffc107
```

| Entry type | What is embedded | What is NOT embedded |
|------------|-----------------|---------------------|
| **URL** | Cleaned article body (`readableContent`) | Title, summary, tags, topics, URL, metadata |
| **Note** | Raw user text as-is | Nothing — it's all embedded |

### The Problem

**Only the article body is embedded.** The AI-generated title, summary, key points, tags, and topics are **not** part of the embedding input. This means:

- Searching for a tag name won't find entries with that tag (unless the tag word appears in the article body)
- Searching for the exact title of an article may not rank it highest
- Short notes embed well (the full text IS the meaning), but long articles may lose signal in noise

---

## Chunking for Long Content

```mermaid
flowchart TD
    A["readableContent\n(variable length)"] --> B{"Length > 5,529 chars?"}
    B -->|No| C["Single embed() call\n= 1 vector"]
    B -->|Yes| D["Split into chunks\nmax 5,529 chars each"]
    D --> E["embedMany() call\n= N vectors"]
    E --> F["Average pooling\n+ L2 normalization"]
    F --> G["Single 1536-dim vector"]
    C --> G

    D --> H{"More than 40 chunks?\n(>221K chars)"}
    H -->|Yes| I["Tail silently dropped\nNo warning logged"]
    
    style I fill:#f8d7da,stroke:#dc3545
```

| Content length | Chunks | Behavior |
|---------------|--------|----------|
| < 5,529 chars | 1 | Direct embed — best quality |
| 5,529 - 221K chars | 2-40 | Chunked + averaged — good quality |
| > 221K chars | 40 (capped) | Tail content lost — degraded quality |

---

## Search Flow (End to End)

```mermaid
sequenceDiagram
    participant U as User (Mobile)
    participant R as Router
    participant AI as OpenAI API
    participant S as Entry Service
    participant DB as PostgreSQL + pgvector

    U->>R: POST /entries/search { query: "react hooks" }
    R->>AI: embed("react hooks")
    AI-->>R: [0.012, -0.034, ...] (1536 dims)
    R->>S: search(userId, { query, limit: 15 }, embedding)
    S->>DB: SELECT entries.*, 1 - (vector <=> query_vec) AS similarity<br/>FROM entries JOIN embeddings<br/>WHERE userId = ? AND isArchived = false<br/>ORDER BY vector <=> query_vec<br/>LIMIT 120
    DB-->>S: rows with similarity scores
    S->>S: Filter similarity >= 0.3, take top 15
    S-->>R: { items: [...] }
    R-->>U: Search results ranked by similarity
```

---

## Current Configuration

| Parameter | Value | Location |
|-----------|-------|----------|
| Embedding model | `text-embedding-3-small` | `generate-embedding.ts:27` |
| Vector dimensions | 1536 | `embeddings.ts:6` |
| Max chars per chunk | 5,529 | `generate-embedding.ts:16-22` |
| Max chunks | 40 | `generate-embedding.ts:25` |
| Similarity threshold | 0.3 | `entry.service.ts:21` |
| Max results | 15 (default), 30 (max) | `entry.contract.ts` |
| Debounce (mobile) | 400ms | `SearchScreen` |
| Vector index | **None** (sequential scan) | `embeddings.ts` |

---

## Known Limitations

See `docs/SEARCH-FINDINGS.md` for the full analysis and improvement roadmap.
