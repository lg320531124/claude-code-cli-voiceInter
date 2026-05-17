# Performance Analysis Report

> Analyzed: 2026-05-14
> Scope: claude-code-cli-voiceInter (React/TS), CLIProxyAPI (Go), hermes-agent (Python)

---

## 1. React Re-Render Issues

### 1.1 MessageList Uses Index as Key (HIGH IMPACT)

**File**: `MessageList.tsx`
**Problem**: Using array index as React key causes unnecessary DOM recreation when messages are inserted, deleted, or reordered.

```tsx
// Current (bad)
{messages.map((msg, index) => (
  <Message key={index} msg={msg} />
))}

// Fix: use stable unique identifier
{messages.map((msg) => (
  <Message key={msg.id || msg.timestamp} msg={msg} />
))}
```

### 1.2 Chat.tsx Saves on Every Messages Change (MEDIUM)

**File**: `Chat.tsx:154`
**Problem**: `useEffect` triggers `saveMessagesToConversation(messages)` on every single message change, including streaming updates.

```tsx
// Current - fires on every render during streaming
useEffect(() => {
  saveMessagesToConversation(messages);
}, [messages, activeConversationId, saveMessagesToConversation]);

// Fix: debounce or only save on specific events
useEffect(() => {
  // Only save when processing stops (response complete)
  if (!isProcessing && messages.length > 0) {
    saveMessagesToConversation(messages);
  }
}, [isProcessing, messages.length]); // not the full messages array
```

### 1.3 Unstable Callback Dependencies (MEDIUM)

**File**: `Chat.tsx:186-211`
**Problem**: `handleVoiceClick` depends on `voice` object which is recreated every render by `useVoiceInteraction`.

```tsx
// Current - voice object changes every render
const handleVoiceClick = useCallback(() => {
  if (!voice.isSupported) { ... }
  if (voice.isListening) { voice.stopListening?.(); }
  voice.startListening?.();
}, [voice, setMessages]);

// Fix: destructure stable primitives
const { isSupported, isListening, stopListening, startListening } = voice;
const handleVoiceClick = useCallback(() => {
  if (!isSupported) { ... }
  if (isListening) { stopListening?.(); }
  startListening?.();
}, [isSupported, isListening, stopListening, startListening, setMessages]);
```

### 1.4 MessageList formatContent Runs Every Render (LOW-MEDIUM)

**File**: `MessageList.tsx`
**Problem**: `formatContent` function runs regex splits on all messages every render.

```tsx
// Fix: memoize formatted content per message
const formattedContent = useMemo(() => {
  return messages.map(msg => ({
    id: msg.id,
    content: formatContent(msg.content),
  }));
}, [messages.map(m => m.content).join('')]); // or use a stable hash
```

---

## 2. Memory Leaks

### 2.1 KokoroTTS Blob URL Leak (HIGH)

**File**: `useKokoroTTS.ts`
**Problem**: `URL.createObjectURL` creates blob URLs that may not be revoked during rapid speak/stop cycles, especially if `onerror` fires.

```tsx
// Fix: track and revoke all blob URLs
const blobUrlRef = useRef<string | null>(null);

const speak = useCallback(async (text: string) => {
  // Revoke previous URL before creating new one
  if (blobUrlRef.current) {
    URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = null;
  }
  // ... create new audio ...
  const url = URL.createObjectURL(audioBlob);
  blobUrlRef.current = url;
}, [...]);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
  };
}, []);
```

### 2.2 WebSocket Reconnection Timeout Leak (MEDIUM)

**File**: `WebSocketContext.tsx`
**Problem**: `reconnectTimeoutRef` could accumulate if component unmounts/re-mounts rapidly during reconnection attempts.

```tsx
// Fix: ensure all timeouts are cleared on cleanup
useEffect(() => {
  return () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    // Also cancel any pending requestAnimationFrame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
  };
}, []);
```

### 2.3 useHybridTTS Missing Stop on Unmount (LOW)

**File**: `useHybridTTS.ts:160-162`
**Status**: Already handled via `stop` ref pattern. No fix needed.

---

## 3. Caching Opportunities

### 3.1 Sticker Cache Hits Disk Every Call (HIGH)

**File**: `hermes-agent/gateway/sticker_cache.py`
**Problem**: `_load_cache` reads entire JSON file from disk on every call. `_save_cache` writes entire JSON file on every call. No in-memory cache.

```python
# Current - disk I/O on every access
def get_cached_description(self, sticker_hash):
    cache = self._load_cache()  # reads file every time
    return cache.get(sticker_hash)

# Fix: in-memory cache with periodic persistence
class StickerCache:
    def __init__(self, cache_file):
        self.cache_file = cache_file
        self._cache = self._load_cache()  # load once at init
        self._dirty = False
        self._save_timer = None

    def get_cached_description(self, sticker_hash):
        return self._cache.get(sticker_hash)  # O(1) memory access

    def cache_sticker_description(self, sticker_hash, description):
        self._cache[sticker_hash] = description
        self._dirty = True
        self._schedule_save()  # batch writes

    def _schedule_save(self):
        if self._save_timer:
            return  # already scheduled
        self._save_timer = threading.Timer(5.0, self._flush)
        self._save_timer.daemon = True
        self._save_timer.start()

    def _flush(self):
        if self._dirty:
            self._save_cache()
            self._dirty = False
        self._save_timer = None
```

### 3.2 TTS Cache Has No Size Limit (MEDIUM)

**File**: `useKokoroTTS.ts` + `ttsCache.ts`
**Problem**: No eviction policy for the TTS audio cache. With many unique phrases, memory grows unbounded.

```ts
// Fix: add max entries with LRU eviction
const MAX_CACHE_ENTRIES = 500;

export function setCachedAudio(text: string, audioBuffer: ArrayBuffer): void {
  if (audioCache.size >= MAX_CACHE_ENTRIES) {
    // Remove oldest entry (or use proper LRU)
    const oldestKey = audioCache.keys().next().value;
    audioCache.delete(oldestKey);
  }
  audioCache.set(text, {
    audio: audioBuffer,
    timestamp: Date.now(),
  });
}
```

### 3.3 Go codexCache Redundant Cleanup Triggers (LOW)

**File**: `CLIProxyAPI/internal/runtime/executor/helps/cache_helpers.go:52,64`
**Problem**: `codexCacheCleanupOnce.Do(startCodexCacheCleanup)` called in both `GetCodexCache` and `SetCodexCache`. Harmless but redundant.

```go
// Fix: only trigger cleanup on Get (the read path that matters)
// SetCodexCache doesn't need to start cleanup - it's already started by Get
func SetCodexCache(key string, cache CodexCache) {
    codexCacheMu.Lock()
    codexCacheMap[key] = cache
    codexCacheMu.Unlock()
}
```

---

## 4. N+1-Like Patterns

### 4.1 Sticker Cache File I/O (see 3.1)

Every `get_cached_description` call = 1 file read. Every `cache_sticker_description` = 1 file read + 1 file write. With N sticker lookups, that's N file reads.

**Fix**: In-memory cache (see 3.1).

### 4.2 Chat saveMessagesToConversation on Every Change (see 1.2)

Every message update during streaming triggers a save. With streaming producing 50+ incremental updates, that's 50+ saves.

**Fix**: Save only on completion (see 1.2).

---

## 5. Redundant Computations

### 5.1 Context Compressor Budget Calculation

**File**: `hermes-agent/agent/context_compressor.py`
**Problem**: `_content_length_for_budget` iterates through multimodal content parts on every budget calculation during compression cycles.

```python
# Fix: cache content length per message, only recalculate when content changes
class ContextCompressor:
    def __init__(self):
        self._length_cache = {}  # message_id -> length

    def _content_length_for_budget(self, message):
        msg_id = id(message)
        if msg_id not in self._length_cache:
            self._length_cache[msg_id] = self._compute_length(message)
        return self._length_cache[msg_id]
```

### 5.2 Context Compressor Sensitive Text Redaction

**File**: `context_compressor.py` - `_serialize_for_summary`
**Problem**: Calls `redact_sensitive_text` on every message content during serialization. If called multiple times during compression cycles, same content gets redacted repeatedly.

```python
# Fix: redact once during initial serialization, store result
def _serialize_for_summary(self, messages):
    serialized = []
    for msg in messages:
        content = msg.get("content", "")
        # Only redact if not already done
        if not msg.get("_redacted"):
            content = redact_sensitive_text(content)
            msg["_redacted"] = True
        serialized.append({...})
    return serialized
```

---

## Priority Summary

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| HIGH | MessageList index keys | Unnecessary DOM recreation | 1 line |
| HIGH | KokoroTTS blob URL leak | Memory growth over time | ~10 lines |
| HIGH | Sticker cache disk I/O | N file reads per session | ~30 lines |
| MEDIUM | Chat save on every message | 50+ redundant saves per response | 3 lines |
| MEDIUM | Unstable voice callback | Re-render cascade in Chat | ~5 lines |
| MEDIUM | TTS cache no limit | Unbounded memory growth | ~5 lines |
| MEDIUM | WebSocket timeout leak | Orphaned timeouts on remount | ~3 lines |
| LOW | MessageList formatContent | Regex on every render | ~5 lines |
| LOW | Go redundant cleanup trigger | Minor code duplication | 1 line |
| LOW | Context compressor budget | Repeated iteration | ~5 lines |
| LOW | Sensitive text re-redaction | Repeated string processing | ~3 lines |
