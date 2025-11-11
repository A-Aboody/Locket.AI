import { useEffect, useRef, useCallback } from 'react';
import { useSearch } from '../contexts/SearchContext';

const DEBOUNCE_DELAY = 200; // Reduced for faster response

export const useSearchWorker = (documentText) => {
  const { query, setMatches, setIsSearching, getCachedMatches } = useSearch();
  const workerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Initialize worker with inline code
  useEffect(() => {
    try {
      // Create worker function that will be converted to blob
      const workerFunction = function() {
        const MAX_MATCHES = 1000; // Limit matches to prevent freezing
        
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
            
            // Find all matches with limit
            while ((match = regex.exec(text)) !== null && matchIndex < MAX_MATCHES) {
              const start = match.index;
              const end = start + match[0].length;
              
              matches.push({
                index: matchIndex,
                start,
                end,
                text: match[0],
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
            self.postMessage({
              matches: [],
              total: 0,
              error: error.message,
            });
          }
        });
      };

      // Convert function to string and create blob
      const workerCode = `(${workerFunction.toString()})()`;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);

      workerRef.current.onmessage = (e) => {
        const { matches, error } = e.data;
        
        if (error) {
          console.error('Search error:', error);
          setMatches([], query);
        } else {
          setMatches(matches, query);
        }
        
        setIsSearching(false);
      };

      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        setIsSearching(false);
      };

      return () => {
        if (workerRef.current) {
          workerRef.current.terminate();
        }
        URL.revokeObjectURL(workerUrl);
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    } catch (error) {
      console.error('Failed to create worker:', error);
      setIsSearching(false);
    }
  }, []);

  // Execute search with debouncing
  const executeSearch = useCallback(() => {
    if (!query.trim() || !documentText) {
      setMatches([], '');
      setIsSearching(false);
      return;
    }

    // Skip very short queries to prevent excessive searching
    if (query.length < 2) {
      setMatches([], query);
      setIsSearching(false);
      return;
    }

    // Check cache first
    const cached = getCachedMatches(query);
    if (cached) {
      setMatches(cached, query);
      setIsSearching(false);
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSearching(true);

    // Debounce the search
    debounceTimerRef.current = setTimeout(() => {
      if (workerRef.current) {
        workerRef.current.postMessage({
          text: documentText,
          query: query,
          caseSensitive: false,
        });
      }
    }, DEBOUNCE_DELAY);
  }, [query, documentText, setMatches, setIsSearching, getCachedMatches]);

  // Trigger search when query changes
  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  return { isSearching: useSearch().isSearching };
};