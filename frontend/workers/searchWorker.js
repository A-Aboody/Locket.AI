// frontend/workers/searchWorker.js
// Web Worker for background text searching
self.addEventListener('message', (e) => {
  const { text, query, caseSensitive = false } = e.data;

  if (!text || !query) {
    self.postMessage({ matches: [], total: 0 });
    return;
  }

  try {
    const matches = [];
    
    // Escape special regex characters
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex with optional case sensitivity
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(escapedQuery, flags);
    
    let match;
    let matchIndex = 0;
    
    // Find all matches
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      // Extract context (50 chars before and after)
      const contextStart = Math.max(0, start - 50);
      const contextEnd = Math.min(text.length, end + 50);
      let context = text.substring(contextStart, contextEnd);
      
      // Add ellipsis if truncated
      if (contextStart > 0) context = '...' + context;
      if (contextEnd < text.length) context = context + '...';
      
      matches.push({
        index: matchIndex,
        start,
        end,
        text: match[0],
        context,
      });
      
      matchIndex++;
      
      // Prevent infinite loops on zero-length matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
    
    self.postMessage({
      matches,
      total: matches.length,
    });
  } catch (error) {
    console.error('Search worker error:', error);
    self.postMessage({
      matches: [],
      total: 0,
      error: error.message,
    });
  }
});