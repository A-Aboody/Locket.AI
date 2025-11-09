import { createContext, useContext, useState, useRef, useCallback } from 'react';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState('text'); // 'text' or 'semantic'

  // Cache for search results (query -> matches)
  const cacheRef = useRef(new Map());

  const currentMatch = currentMatchIndex >= 0 && currentMatchIndex < matches.length
    ? matches[currentMatchIndex]
    : null;

  const clearSearch = useCallback(() => {
    setQuery('');
    setMatches([]);
    setCurrentMatchIndex(-1);
    setIsSearching(false);
    cacheRef.current.clear();
  }, []);

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return;
    const newIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(newIndex);
  }, [matches.length, currentMatchIndex]);

  const prevMatch = useCallback(() => {
    if (matches.length === 0) return;
    const newIndex = currentMatchIndex - 1 < 0 ? matches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
  }, [matches.length, currentMatchIndex]);

  const updateMatches = useCallback((newMatches, newQuery) => {
    setMatches(newMatches);
    // Start from first match when new results come in
    setCurrentMatchIndex(newMatches.length > 0 ? 0 : -1);
    setIsSearching(false);

    // Cache the results
    if (newQuery && newMatches.length > 0) {
      cacheRef.current.set(newQuery.toLowerCase(), newMatches);
    }
  }, []);

  const getCachedMatches = useCallback((searchQuery) => {
    return cacheRef.current.get(searchQuery.toLowerCase());
  }, []);

  const value = {
    query,
    setQuery,
    matches,
    setMatches: updateMatches,
    currentMatchIndex,
    setCurrentMatchIndex,
    currentMatch,
    isSearching,
    setIsSearching,
    searchMode,
    setSearchMode,
    nextMatch,
    prevMatch,
    clearSearch,
    getCachedMatches,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};