import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  Spinner,
  Text,
  Portal,
  useToast,
  Button,
  HStack,
  Icon,
  useDisclosure,
} from '@chakra-ui/react';
import { FiAlertCircle, FiUpload } from 'react-icons/fi';
import { pdfjs } from 'react-pdf';
import { SearchProvider, useSearch } from '../contexts/SearchContext';
import { useSearchWorker } from '../hooks/useSearchWorker';
import { usePDFSearch } from './document_viewer/usePDFSearch';
import DocumentToolbar from './document_viewer/DocumentToolbar';
import PDFViewer from './document_viewer/PDFViewer';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use local worker file for Electron compatibility
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs/pdf.worker.min.mjs',
  window.location.href
).toString();

const LocalFileViewerInner = ({ filePath, onClose }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fitWidth, setFitWidth] = useState(false);
  const [visiblePages, setVisiblePages] = useState(new Set([1]));
  const [containerWidth, setContainerWidth] = useState(0);
  const [extractedContent, setExtractedContent] = useState('');
  const [uploading, setUploading] = useState(false);

  const scrollContainerRef = useRef(null);
  const pageRefs = useRef({});
  const blobUrlRef = useRef(null);
  const observerRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // Search functionality
  const { isOpen: searchOpen, onToggle: toggleSearch, onClose: closeSearch } = useDisclosure();
  const { query, matches, currentMatchIndex, clearSearch } = useSearch();

  // Initialize search worker
  useSearchWorker(extractedContent);

  // Use PDF search hook
  const { highlightPDFMatches, clearAllHighlights } = usePDFSearch({
    query,
    matches,
    currentMatchIndex,
    fileType,
    viewMode: 'native',
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
    if (fileType === 'pdf' && searchOpen && query.trim() && matches.length > 0) {
      highlightPDFMatches();
    } else {
      clearAllHighlights();
    }
  }, [visiblePages, query, matches, currentMatchIndex, fileType, searchOpen, highlightPDFMatches, clearAllHighlights]);

  // Clear highlights when search is closed
  useEffect(() => {
    if (!searchOpen) {
      clearAllHighlights();
    }
  }, [searchOpen, clearAllHighlights]);

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
  }, [searchOpen, currentPage, numPages, fileType, onClose, toggleSearch]);

  // Setup Intersection Observer for page visibility
  useEffect(() => {
    if (!numPages || fileType !== 'pdf') return;

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
              for (let i = Math.max(1, pageNum - 2); i <= Math.min(numPages, pageNum + 2); i++) {
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
  }, [numPages, fileType]);

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

  // Load the local file
  useEffect(() => {
    loadLocalFile();

    return () => {
      // Cleanup blob URL on unmount
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [filePath]);

  const handleCloseSearch = useCallback(() => {
    closeSearch();
    clearSearch();
    clearAllHighlights();
  }, [closeSearch, clearSearch, clearAllHighlights]);

  const loadLocalFile = async () => {
    if (!window.electron) {
      setError('File viewing only available in desktop app');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[LocalFileViewer] Loading file:', filePath);

      // Read file via IPC
      const result = await window.electron.readLocalFile(filePath);

      if (!result.success) {
        throw new Error(result.error);
      }

      const { data, filename, size } = result;

      // Determine file type
      const extension = filename.split('.').pop().toLowerCase();
      setFileType(extension);

      // Create file metadata
      setFileData({
        filename,
        file_type: `application/${extension}`,
        file_size: size,
        uploaded_at: new Date().toISOString(),
        is_local: true,
        file_path: filePath,
      });

      // Convert array back to Uint8Array, then to Blob
      const uint8Array = new Uint8Array(data);
      const blob = new Blob([uint8Array]);

      if (extension === 'pdf') {
        // Create blob URL for PDF
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setPdfFile(url);

        // Extract text from PDF for search
        try {
          const pdf = await pdfjs.getDocument(url).promise;
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += pageText + '\n\n';
          }

          setExtractedContent(fullText);
          console.log('[LocalFileViewer] Extracted text length:', fullText.length);
        } catch (err) {
          console.error('[LocalFileViewer] Failed to extract text:', err);
        }
      } else if (extension === 'txt') {
        // Read text content
        const text = new TextDecoder().decode(uint8Array);
        setPdfFile(text);
        setExtractedContent(text);
      } else {
        // For other file types, just store the blob
        setPdfFile(blob);
      }

      setLoading(false);
    } catch (error) {
      console.error('[LocalFileViewer] Error loading file:', error);
      setError(error.message);
      setLoading(false);

      toast({
        title: 'Failed to open file',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleUploadToLocket = async () => {
    if (!window.electron || !fileData) return;

    try {
      setUploading(true);

      // Read the file again to get the data
      const result = await window.electron.readLocalFile(filePath);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Create a File object from the data
      const uint8Array = new Uint8Array(result.data);
      const blob = new Blob([uint8Array]);
      const file = new File([blob], result.filename, {
        type: fileData.file_type,
      });

      // Import the documentsAPI
      const { documentsAPI } = await import('../utils/api');

      // Create FormData for upload (matching DocumentUpload component pattern)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('visibility', 'private');

      // Upload the file
      const response = await documentsAPI.upload(formData);

      toast({
        title: 'File uploaded successfully!',
        description: `"${result.filename}" has been added to your Locket library`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Close the viewer after successful upload
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('[LocalFileViewer] Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error.response?.data?.detail || error.message || 'Failed to upload file to Locket',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = () => {
    // For local files, just show the file location
    toast({
      title: 'File Location',
      description: filePath,
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
  };

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
    setError('Failed to load PDF file');
  }, []);

  // Navigation functions
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
    if (currentPage > 1) goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < numPages) goToPage(currentPage + 1);
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
            <Text color="gray.400">Loading file...</Text>
          </VStack>
        </Box>
      </Portal>
    );
  }

  if (error) {
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
          <VStack spacing={4} maxW="md" p={6}>
            <Icon as={FiAlertCircle} boxSize={12} color="red.500" />
            <Text color="white" fontSize="xl" fontWeight="bold">
              Failed to Open File
            </Text>
            <Text color="gray.400" textAlign="center">
              {error}
            </Text>
            <Button colorScheme="accent" onClick={onClose}>
              Close
            </Button>
          </VStack>
        </Box>
      </Portal>
    );
  }

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
        {/* Toolbar with "Viewing Temporary File" indicator and Upload button */}
        <Box bg="primary.800" borderBottom="1px" borderColor="primary.600" px={4} py={2}>
          <HStack justify="space-between">
            <HStack spacing={3}>
              <Icon as={FiAlertCircle} color="yellow.500" />
              <Text color="yellow.500" fontSize="sm" fontWeight="medium">
                Temporary View
              </Text>
              <Text color="gray.500" fontSize="sm">
                •
              </Text>
              <Text color="gray.400" fontSize="sm">
                {fileData?.filename}
              </Text>
            </HStack>
            <Button
              leftIcon={<Icon as={FiUpload} />}
              size="sm"
              colorScheme="accent"
              variant="solid"
              onClick={handleUploadToLocket}
              isLoading={uploading}
              loadingText="Uploading..."
            >
              Upload to Locket
            </Button>
          </HStack>
        </Box>

        <DocumentToolbar
          documentData={fileData}
          fileType={fileType}
          viewMode="native"
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
          {fileType === 'pdf' && (
            <PDFViewer
              pdfFile={pdfFile}
              numPages={numPages}
              currentPage={currentPage}
              scale={scale}
              fitWidth={fitWidth}
              visiblePages={visiblePages}
              containerWidth={containerWidth}
              viewerLoading={false}
              scrollContainerRef={scrollContainerRef}
              pageRefs={pageRefs}
              onDocumentLoadSuccess={onDocumentLoadSuccess}
              onDocumentLoadError={onDocumentLoadError}
              onDownload={handleDownload}
            />
          )}

          {fileType === 'txt' && (
            <Box p={6} h="full" overflowY="auto" bg="primary.900">
              <Text color="gray.300" whiteSpace="pre-wrap" fontFamily="monospace">
                {pdfFile}
              </Text>
            </Box>
          )}

          {(fileType === 'docx' || fileType === 'doc') && (
            <Box p={6} h="full" overflowY="auto" bg="primary.900">
              <VStack spacing={4}>
                <Icon as={FiAlertCircle} boxSize={8} color="gray.500" />
                <Text color="gray.400" textAlign="center">
                  DOCX viewing for local files coming soon...
                </Text>
                <Text color="gray.500" fontSize="sm" textAlign="center">
                  For now, only PDF and TXT files are supported for temporary viewing.
                </Text>
              </VStack>
            </Box>
          )}

          {!['pdf', 'txt', 'docx', 'doc'].includes(fileType) && (
            <Box p={6} h="full" overflowY="auto" bg="primary.900">
              <VStack spacing={4}>
                <Icon as={FiAlertCircle} boxSize={8} color="gray.500" />
                <Text color="gray.400" textAlign="center">
                  Unsupported file type: {fileType}
                </Text>
                <Text color="gray.500" fontSize="sm" textAlign="center">
                  Only PDF and TXT files are currently supported for temporary viewing.
                </Text>
              </VStack>
            </Box>
          )}
        </Box>
      </Box>
    </Portal>
  );
};

const LocalFileViewer = ({ filePath, onClose }) => {
  return (
    <SearchProvider>
      <LocalFileViewerInner filePath={filePath} onClose={onClose} />
    </SearchProvider>
  );
};

export default LocalFileViewer;
