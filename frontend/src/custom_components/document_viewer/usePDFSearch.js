import { useEffect, useRef, useCallback } from 'react';

const SEARCH_RENDER_BUFFER = 5; // Increased buffer for better coverage

export const usePDFSearch = ({
  query,
  matches,
  currentMatchIndex,
  fileType,
  viewMode,
  extractedContent,
  numPages,
  scrollContainerRef,
  pageRefs,
  currentPage,
  setCurrentPage,
  setVisiblePages,
  visiblePages,
}) => {
  const matchPageMapRef = useRef(new Map());
  const isHighlightingRef = useRef(false);
  const pendingNavigationRef = useRef(null);
  const lastSuccessfulMatchRef = useRef(-1);
  const actualMatchLocationsRef = useRef(new Map()); // Track actual found locations

  // Function to clear all highlights
  const clearAllHighlights = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    container.querySelectorAll('.search-highlight, .current-search-highlight').forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });
  }, [scrollContainerRef]);

  // Build page mapping for PDF search results with wider initial range
  const buildPageMapping = useCallback(() => {
    if (!extractedContent || matches.length === 0 || !numPages) return;

    const pageMapping = new Map();
    const contentLength = extractedContent.length;

    matches.forEach((match, index) => {
      // Check if we already found the actual location
      if (actualMatchLocationsRef.current.has(index)) {
        pageMapping.set(index, actualMatchLocationsRef.current.get(index));
        return;
      }

      // Initial estimation - use a more conservative approach
      const position = match.start / contentLength;
      const estimatedPage = Math.min(
        Math.max(1, Math.ceil(position * numPages) || 1),
        numPages
      );
      pageMapping.set(index, estimatedPage);
    });

    matchPageMapRef.current = pageMapping;
  }, [extractedContent, matches, numPages]);

  // Function to find highlight across all rendered pages
  const findHighlightInDOM = useCallback((matchIndex) => {
    if (!scrollContainerRef.current) return null;

    const container = scrollContainerRef.current;
    const highlight = container.querySelector(`mark[data-match-index="${matchIndex}"]`);

    if (highlight) {
      const pageContainer = highlight.closest('[data-page-number]');
      if (pageContainer) {
        const actualPage = parseInt(pageContainer.dataset.pageNumber);
        // Store the actual location for future reference
        actualMatchLocationsRef.current.set(matchIndex, actualPage);
        return { highlight, page: actualPage };
      }
    }
    return null;
  }, [scrollContainerRef]);

  // Function to navigate to a specific match - returns success status
  const navigateToMatch = useCallback((targetPage, matchIndex) => {
    if (!scrollContainerRef.current || !query.trim()) return false;

    try {
      // First, try to find the highlight in already rendered pages
      const found = findHighlightInDOM(matchIndex);

      if (found) {
        // Found it! Navigate to it
        found.highlight.scrollIntoView({
          behavior: 'instant',
          block: 'center',
          inline: 'nearest'
        });
        setCurrentPage(found.page);
        return true;
      }

      // If not found, navigate to the estimated page
      if (targetPage !== currentPage) {
        const pageElement = pageRefs.current[targetPage];
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'instant', block: 'start' });
          setCurrentPage(targetPage);
        }
      }

      return false;
    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  }, [currentPage, query, scrollContainerRef, pageRefs, setCurrentPage, findHighlightInDOM]);

  // Aggressively search for highlight by rendering wider page range
  const tryAdjacentPages = useCallback((matchIndex, originalPage) => {
    if (!numPages || !query.trim()) return;

    // Expand search range significantly - up to 10 pages in each direction
    const pagesToTry = [originalPage];
    for (let offset = 1; offset <= 10; offset++) {
      if (originalPage - offset >= 1) pagesToTry.push(originalPage - offset);
      if (originalPage + offset <= numPages) pagesToTry.push(originalPage + offset);
    }

    // Render all these pages
    setVisiblePages(prev => {
      const newVisible = new Set(prev);
      pagesToTry.forEach(page => newVisible.add(page));
      return newVisible;
    });

    // Try multiple times with increasing delays
    let attempts = 0;
    const maxAttempts = 8;

    const checkForHighlight = () => {
      const found = findHighlightInDOM(matchIndex);

      if (found) {
        // Success! Navigate to it
        found.highlight.scrollIntoView({
          behavior: 'instant',
          block: 'center',
          inline: 'nearest'
        });
        setCurrentPage(found.page);
        matchPageMapRef.current.set(matchIndex, found.page);
        lastSuccessfulMatchRef.current = matchIndex;
      } else if (attempts < maxAttempts) {
        // Not found yet, try again with longer delay
        attempts++;
        setTimeout(checkForHighlight, 200 + (attempts * 100));
      } else {
        // Give up and just go to best estimate
        console.warn(`Could not locate highlight ${matchIndex} after ${maxAttempts} attempts`);
        const pageElement = pageRefs.current[originalPage];
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'instant', block: 'center' });
          setCurrentPage(originalPage);
        }
      }
    };

    setTimeout(checkForHighlight, 300);
  }, [numPages, query, findHighlightInDOM, setCurrentPage, setVisiblePages, pageRefs]);

  // Function to highlight matches in PDF text layer
  const highlightPDFMatches = useCallback(() => {
    if (!scrollContainerRef.current || !query.trim() || matches.length === 0) {
      if (!query.trim()) {
        clearAllHighlights();
      }
      return;
    }
    if (isHighlightingRef.current) return;

    isHighlightingRef.current = true;

    requestAnimationFrame(() => {
      try {
        const container = scrollContainerRef.current;
        if (!container) {
          isHighlightingRef.current = false;
          return;
        }

        const allTextLayers = Array.from(container.querySelectorAll('.react-pdf__Page__textContent'));

        if (!allTextLayers || allTextLayers.length === 0) {
          isHighlightingRef.current = false;
          setTimeout(() => highlightPDFMatches(), 100);
          return;
        }

        clearAllHighlights();

        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'gi');

        let globalMatchIndex = 0;

        allTextLayers.forEach((textLayer) => {
          const walker = document.createTreeWalker(
            textLayer,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );

          const nodesToProcess = [];
          let node;
          while ((node = walker.nextNode())) {
            if (node.textContent && regex.test(node.textContent)) {
              nodesToProcess.push(node);
            }
            regex.lastIndex = 0;
          }

          nodesToProcess.forEach(textNode => {
            const text = textNode.textContent;
            const parent = textNode.parentNode;
            if (!parent) return;

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            regex.lastIndex = 0;
            while ((match = regex.exec(text)) !== null) {
              if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
              }

              const mark = document.createElement('mark');
              mark.textContent = match[0];
              mark.setAttribute('data-match-index', globalMatchIndex);
              mark.className = globalMatchIndex === currentMatchIndex ? 'current-search-highlight' : 'search-highlight';

              fragment.appendChild(mark);
              lastIndex = match.index + match[0].length;
              globalMatchIndex++;
            }

            if (lastIndex < text.length) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            if (fragment.childNodes.length > 0) {
              parent.replaceChild(fragment, textNode);
            }
          });
        });

        isHighlightingRef.current = false;

      } catch (error) {
        console.error('PDF highlighting error:', error);
        isHighlightingRef.current = false;
      }
    });
  }, [query, matches, currentMatchIndex, clearAllHighlights, scrollContainerRef]);

  // Clear highlights when search is closed or query is empty
  useEffect(() => {
    if (!query.trim()) {
      clearAllHighlights();
      matchPageMapRef.current.clear();
      lastSuccessfulMatchRef.current = -1;
      pendingNavigationRef.current = null;
    }
  }, [query, clearAllHighlights]);

  // When matches change, build page mapping
  useEffect(() => {
    if (matches.length === 0 || fileType !== 'pdf' || viewMode !== 'native' || !query.trim()) {
      matchPageMapRef.current.clear();
      if (!query.trim()) {
        clearAllHighlights();
      }
      return;
    }

    if (fileType === 'pdf' && extractedContent && numPages) {
      buildPageMapping();
    }
  }, [matches, fileType, viewMode, extractedContent, numPages, query, buildPageMapping, clearAllHighlights]);

  // When current match changes, navigate to it
  useEffect(() => {
    if (matches.length === 0 || currentMatchIndex < 0 || !query.trim()) return;

    if (currentMatchIndex === lastSuccessfulMatchRef.current) return;

    // Check if we know the actual location from previous searches
    let targetPage = actualMatchLocationsRef.current.get(currentMatchIndex);

    if (!targetPage) {
      // Fall back to estimated location
      targetPage = matchPageMapRef.current.get(currentMatchIndex);
    }

    if (targetPage) {
      // Render a wider range of pages to increase chance of finding the highlight
      setVisiblePages((prev) => {
        const newVisible = new Set(prev);
        for (let i = Math.max(1, targetPage - SEARCH_RENDER_BUFFER); i <= Math.min(numPages, targetPage + SEARCH_RENDER_BUFFER); i++) {
          newVisible.add(i);
        }
        return newVisible;
      });

      pendingNavigationRef.current = {
        targetPage,
        matchIndex: currentMatchIndex,
        attempts: 0,
        maxAttempts: 6 // Increased attempts
      };
    }
  }, [currentMatchIndex, matches.length, fileType, viewMode, numPages, query, setVisiblePages]);

  // Effect to handle navigation after pages are rendered
  useEffect(() => {
    if (!pendingNavigationRef.current || !query.trim()) return;

    const { targetPage, matchIndex, attempts, maxAttempts } = pendingNavigationRef.current;

    if (matchIndex !== currentMatchIndex) return; // Stale navigation

    const success = navigateToMatch(targetPage, matchIndex);

    if (success) {
      lastSuccessfulMatchRef.current = matchIndex;
      pendingNavigationRef.current = null;
    } else if (attempts < maxAttempts) {
      // Retry with increasing delay
      pendingNavigationRef.current.attempts += 1;
      const delay = 150 + (attempts * 50); // Increasing delay: 150ms, 200ms, 250ms...

      setTimeout(() => {
        if (pendingNavigationRef.current && query.trim() && pendingNavigationRef.current.matchIndex === currentMatchIndex) {
          const success = navigateToMatch(targetPage, matchIndex);
          if (success) {
            lastSuccessfulMatchRef.current = matchIndex;
            pendingNavigationRef.current = null;
          }
        }
      }, delay);
    } else {
      // After max attempts, try aggressive wide-range search
      console.log(`Initiating wide-range search for match ${matchIndex} around page ${targetPage}`);
      tryAdjacentPages(matchIndex, targetPage);
      pendingNavigationRef.current = null;
    }
  }, [visiblePages, currentMatchIndex, query, navigateToMatch, tryAdjacentPages]);

  return {
    highlightPDFMatches,
    clearAllHighlights,
  };
};
