//frontend/src/custom_components/document_viewer/index.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  VStack,
  Spinner,
  Text,
  Portal,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
} from '@chakra-ui/react';
import { pdfjs } from 'react-pdf';
import { SearchProvider, useSearch } from '../../contexts/SearchContext';
import { useSearchWorker } from '../../hooks/useSearchWorker';
import { useDocumentData } from './useDocumentData';
import { usePDFSearch } from './usePDFSearch';
import DocumentToolbar from './DocumentToolbar';
import PDFViewer from './PDFViewer';
import DOCXViewer from './DOCXViewer';
import TextView from './TextView';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use local worker file for Electron compatibility
// In production, the worker is bundled at ./pdfjs/pdf.worker.min.mjs
// Use window.location to resolve the correct path in Electron
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs/pdf.worker.min.mjs',
  window.location.href
).toString();

// Add CSS for PDF search highlighting
if (typeof document !== 'undefined') {
  const styleId = 'pdf-search-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .search-highlight {
        background-color: #ffeb3b !important;
        color: #000 !important;
        padding: 1px 2px;
        border-radius: 2px;
      }
      .current-search-highlight {
        background-color: #ff9800 !important;
        color: #000 !important;
        padding: 1px 2px;
        border-radius: 2px;
        box-shadow: 0 0 0 2px #ff5722;
      }
    `;
    document.head.appendChild(style);
  }
}

const BUFFER_PAGES = 2;

// Inner component that uses search context
const DocumentViewerInner = ({ documentId, onClose }) => {
  const toast = useToast();

  // Use custom hooks
  const {
    documentData,
    loading,
    viewerLoading,
    pdfFile,
    fileType,
    extractedContent,
    handleDownload,
    renderDocx,
  } = useDocumentData(documentId, onClose);

  // PDF state
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fitWidth, setFitWidth] = useState(false);
  const [visiblePages, setVisiblePages] = useState(new Set([1]));
  const [containerWidth, setContainerWidth] = useState(0);

  // Refs
  const docxContainerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const pageRefs = useRef({});
  const observerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const highlightRefs = useRef({});

  // View mode
  const [viewMode, setViewMode] = useState('native');

  // Search
  const { isOpen: searchOpen, onToggle: toggleSearch, onClose: closeSearch } = useDisclosure();
  const { query, matches, currentMatchIndex, currentMatch, clearSearch } = useSearch();

  // Initialize search worker
  useSearchWorker(extractedContent);

  // Use PDF search hook
  const { highlightPDFMatches, clearAllHighlights } = usePDFSearch({
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
  });

  // Apply PDF highlighting when visible pages change
  useEffect(() => {
    if (fileType === 'pdf' && viewMode === 'native' && searchOpen && query.trim() && matches.length > 0) {
      highlightPDFMatches();
    } else {
      clearAllHighlights();
    }
  }, [visiblePages, query, matches, currentMatchIndex, fileType, viewMode, searchOpen, highlightPDFMatches, clearAllHighlights]);

  // Scroll to current match in text view
  useEffect(() => {
    if (currentMatch && highlightRefs.current[currentMatch.index] && query.trim()) {
      const element = highlightRefs.current[currentMatch.index];
      element.scrollIntoView({
        behavior: 'instant',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, [currentMatch, query]);

  // Enhanced search close handler
  const handleCloseSearch = useCallback(() => {
    closeSearch();
    clearSearch();
    clearAllHighlights();
  }, [closeSearch, clearSearch, clearAllHighlights]);

  // Clear highlights when search is closed
  useEffect(() => {
    if (!searchOpen) {
      clearAllHighlights();
    }
  }, [searchOpen, clearAllHighlights]);

  // Main cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Setup resize observer
  useEffect(() => {
    if (scrollContainerRef.current) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        const width = entries[0].contentRect.width;
        setContainerWidth(width);
      });

      resizeObserverRef.current.observe(scrollContainerRef.current);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Setup Intersection Observer for page visibility
  useEffect(() => {
    if (!numPages || fileType !== 'pdf' || viewMode !== 'native') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let mostVisible = null;
        let maxRatio = 0;

        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.dataset.pageNumber);
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            mostVisible = pageNum;
            maxRatio = entry.intersectionRatio;
          }
        });

        if (mostVisible !== null && maxRatio > 0.3) {
          setCurrentPage(mostVisible);
        }

        setVisiblePages((prev) => {
          const newVisible = new Set(prev);

          entries.forEach((entry) => {
            const pageNum = parseInt(entry.target.dataset.pageNumber);
            if (entry.isIntersecting) {
              for (let i = Math.max(1, pageNum - BUFFER_PAGES); i <= Math.min(numPages, pageNum + BUFFER_PAGES); i++) {
                newVisible.add(i);
              }
            }
          });

          return newVisible;
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        rootMargin: '-100px 0px -100px 0px',
      }
    );

    Object.values(pageRefs.current).forEach((ref) => {
      if (ref) {
        observerRef.current.observe(ref);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [numPages, fileType, viewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        toggleSearch();
      }

      if (e.key === 'Escape') {
        if (searchOpen) {
          handleCloseSearch();
        } else {
          onClose();
        }
      }

      if (!searchOpen && fileType === 'pdf') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          goToPreviousPage();
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          goToNextPage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchOpen, currentPage, numPages, fileType, handleCloseSearch, onClose, toggleSearch]);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    const initialPages = new Set();
    for (let i = 1; i <= Math.min(5, numPages); i++) {
      initialPages.add(i);
    }
    setVisiblePages(initialPages);
  }, []);

  const onDocumentLoadError = useCallback((error) => {
    console.error('PDF load error:', error);
    toast({
      title: 'Failed to load PDF',
      description: 'The PDF file could not be loaded. Try downloading it instead.',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  }, [toast]);

  const goToPage = useCallback(
    (pageNum) => {
      if (pageNum >= 1 && pageNum <= numPages) {
        const pageElement = pageRefs.current[pageNum];
        if (pageElement && scrollContainerRef.current) {
          pageElement.scrollIntoView({ behavior: 'instant', block: 'start' });
          setCurrentPage(pageNum);
        }
      }
    },
    [numPages]
  );

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < numPages) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, numPages, goToPage]);

  const zoomIn = useCallback(() => {
    setFitWidth(false);
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setFitWidth(false);
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const toggleFitWidth = useCallback(() => {
    setFitWidth((prev) => !prev);
  }, []);

  // Render DOCX
  useEffect(() => {
    if (pdfFile && fileType === 'docx' && docxContainerRef.current && viewMode === 'native') {
      renderDocx(docxContainerRef);
    }
  }, [pdfFile, fileType, viewMode, renderDocx]);

  // Optimized highlight rendering with memoization
  const highlightedText = useMemo(() => {
    if (!extractedContent) {
      return null;
    }

    if (matches.length === 0 || !query.trim()) {
      return extractedContent;
    }

    const parts = [];
    let lastIndex = 0;

    matches.forEach((match) => {
      if (match.start > lastIndex) {
        parts.push({
          type: 'text',
          content: extractedContent.substring(lastIndex, match.start),
          key: `text-${lastIndex}`,
        });
      }

      parts.push({
        type: 'highlight',
        content: extractedContent.substring(match.start, match.end),
        key: `match-${match.index}`,
        index: match.index,
        isCurrent: match.index === currentMatchIndex,
      });

      lastIndex = match.end;
    });

    if (lastIndex < extractedContent.length) {
      parts.push({
        type: 'text',
        content: extractedContent.substring(lastIndex),
        key: `text-${lastIndex}`,
      });
    }

    return parts;
  }, [extractedContent, matches, currentMatchIndex, query]);

  if (loading) {
    return (
      <Portal>
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="primary.900"
          zIndex={9999}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack spacing={4}>
            <Spinner size="xl" color="accent.500" thickness="4px" />
            <Text color="gray.400">Loading document...</Text>
          </VStack>
        </Box>
      </Portal>
    );
  }

  if (!documentData) {
    return null;
  }

  const canRenderNatively = ['pdf', 'docx', 'doc'].includes(fileType);

  return (
    <Portal>
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="primary.900"
        zIndex={9999}
        display="flex"
        flexDirection="column"
      >
        <DocumentToolbar
          documentData={documentData}
          fileType={fileType}
          viewMode={viewMode}
          numPages={numPages}
          currentPage={currentPage}
          scale={scale}
          fitWidth={fitWidth}
          searchOpen={searchOpen}
          onClose={onClose}
          onDownload={handleDownload}
          onToggleSearch={toggleSearch}
          onCloseSearch={handleCloseSearch}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onToggleFitWidth={toggleFitWidth}
        />

        <Box flex={1} overflow="hidden">
          {canRenderNatively && extractedContent ? (
            <Tabs
              colorScheme="accent"
              index={viewMode === 'native' ? 0 : 1}
              onChange={(index) => setViewMode(index === 0 ? 'native' : 'text')}
              variant="line"
              display="flex"
              flexDirection="column"
              h="full"
            >
              <TabList px={4} bg="primary.800" borderBottom="1px" borderColor="primary.600">
                <Tab color="gray.400" _selected={{ color: 'accent.500', borderColor: 'accent.500' }}>
                  Document View
                </Tab>
                <Tab color="gray.400" _selected={{ color: 'accent.500', borderColor: 'accent.500' }}>
                  Text View
                </Tab>
              </TabList>

              <TabPanels flex={1} overflow="hidden">
                <TabPanel p={0} h="full">
                  {fileType === 'pdf' ? (
                    <PDFViewer
                      pdfFile={pdfFile}
                      numPages={numPages}
                      currentPage={currentPage}
                      scale={scale}
                      fitWidth={fitWidth}
                      visiblePages={visiblePages}
                      containerWidth={containerWidth}
                      viewerLoading={viewerLoading}
                      scrollContainerRef={scrollContainerRef}
                      pageRefs={pageRefs}
                      onDocumentLoadSuccess={onDocumentLoadSuccess}
                      onDocumentLoadError={onDocumentLoadError}
                      onDownload={handleDownload}
                    />
                  ) : (
                    <Box
                      ref={scrollContainerRef}
                      h="full"
                      overflowY="auto"
                      overflowX="hidden"
                      bg="#2a2a2a"
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                    >
                      <DOCXViewer docxContainerRef={docxContainerRef} />
                    </Box>
                  )}
                </TabPanel>

                <TabPanel p={0} h="full">
                  <Box p={6} h="full" overflowY="auto" bg="primary.900">
                    <TextView
                      extractedContent={extractedContent}
                      highlightedText={highlightedText}
                      highlightRefs={highlightRefs}
                    />
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          ) : (
            <Box p={6} h="full" overflowY="auto" bg="primary.900">
              {extractedContent ? (
                <TextView
                  extractedContent={extractedContent}
                  highlightedText={highlightedText}
                  highlightRefs={highlightRefs}
                />
              ) : (
                <Box textAlign="center" py={12}>
                  <Text color="gray.500">No text content could be extracted from this document</Text>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Portal>
  );
};

// Wrapper component with SearchProvider
const DocumentViewer = ({ documentId, onClose }) => {
  return (
    <SearchProvider>
      <DocumentViewerInner documentId={documentId} onClose={onClose} />
    </SearchProvider>
  );
};

export default DocumentViewer;
