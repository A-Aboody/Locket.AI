import { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Spinner,
  useToast,
  Icon,
  Badge,
  IconButton,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { FiX, FiFile, FiDownload, FiZoomIn, FiZoomOut, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Document, Page, pdfjs } from 'react-pdf';
import * as mammoth from 'mammoth';
import { renderAsync } from 'docx-preview';
import { documentsAPI } from '../utils/api';
import { formatFileSize, formatDate, getFileTypeColor } from '../utils/formatters';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DocumentViewer = ({ documentId, onClose }) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerLoading, setViewerLoading] = useState(false);
  const toast = useToast();
  
  // PDF state
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  
  // File data
  const [fileBlob, setFileBlob] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [extractedContent, setExtractedContent] = useState('');
  
  // Refs
  const docxContainerRef = useRef(null);
  
  // View mode
  const [viewMode, setViewMode] = useState('native'); // 'native' or 'text'

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      
      // Fetch metadata
      const metaResponse = await documentsAPI.get(documentId);
      const docData = metaResponse.data;
      setDocument(docData);
      
      // Determine file type
      const extension = docData.filename.split('.').pop().toLowerCase();
      setFileType(extension);
      
      // Fetch extracted text content
      try {
        const contentResponse = await documentsAPI.getContent(documentId);
        setExtractedContent(contentResponse.data.content);
      } catch (err) {
        console.warn('Could not fetch extracted content:', err);
      }
      
      // Fetch actual file for native rendering
      if (['pdf', 'docx', 'doc'].includes(extension)) {
        setViewerLoading(true);
        const fileResponse = await documentsAPI.downloadFile(documentId);
        setFileBlob(fileResponse.data);
        setViewerLoading(false);
      }
      
    } catch (error) {
      toast({
        title: 'Failed to load document',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await documentsAPI.downloadFile(documentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Download started',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // PDF rendering
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  // DOCX rendering
  useEffect(() => {
    if (fileBlob && fileType === 'docx' && docxContainerRef.current && viewMode === 'native') {
      renderDocx();
    }
  }, [fileBlob, fileType, viewMode]);

  const renderDocx = async () => {
    if (!docxContainerRef.current || !fileBlob) return;
    
    try {
      setViewerLoading(true);
      docxContainerRef.current.innerHTML = '';
      
      await renderAsync(fileBlob, docxContainerRef.current, null, {
        className: 'docx-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
        useBase64URL: true,
      });
      
      setViewerLoading(false);
    } catch (error) {
      console.error('Error rendering DOCX:', error);
      setViewerLoading(false);
      toast({
        title: 'DOCX rendering failed',
        description: 'Switching to text view',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      setViewMode('text');
    }
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  if (loading) {
    return (
      <Box bg="white" p={8} rounded="lg" shadow="md" textAlign="center">
        <Spinner size="xl" color="blue.500" />
        <Text mt={4} color="gray.600">Loading document...</Text>
      </Box>
    );
  }

  if (!document) {
    return null;
  }

  const canRenderNatively = ['pdf', 'docx', 'doc'].includes(fileType);

  return (
    <Box bg="white" rounded="lg" shadow="md" overflow="hidden">
      {/* Header */}
      <Box bg="gray.50" p={4} borderBottom="1px" borderColor="gray.200">
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Icon as={FiFile} boxSize={6} color={`${getFileTypeColor(document.filename)}.500`} />
            <VStack align="start" spacing={0}>
              <Text fontWeight="bold" fontSize="lg" color="gray.800">
                {document.filename}
              </Text>
              <HStack spacing={3} fontSize="sm" color="gray.600">
                <Badge colorScheme={getFileTypeColor(document.filename)}>
                  {getFileExtension(document.filename)}
                </Badge>
                <Text>{formatFileSize(document.file_size)}</Text>
                <Text>•</Text>
                <Text>{document.page_count} {document.page_count === 1 ? 'page' : 'pages'}</Text>
                <Text>•</Text>
                <Text>{formatDate(document.uploaded_at)}</Text>
              </HStack>
            </VStack>
          </HStack>
          <HStack spacing={2}>
            <Button
              size="sm"
              leftIcon={<FiDownload />}
              onClick={handleDownload}
              colorScheme="blue"
              variant="ghost"
            >
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<FiX />}
              onClick={onClose}
            >
              Close
            </Button>
          </HStack>
        </HStack>
      </Box>

      {/* Viewer Controls (for PDF) */}
      {fileType === 'pdf' && viewMode === 'native' && numPages && (
        <Box bg="gray.100" p={3} borderBottom="1px" borderColor="gray.200">
          <HStack justify="center" spacing={4}>
            <HStack>
              <IconButton
                icon={<FiChevronLeft />}
                onClick={previousPage}
                isDisabled={pageNumber <= 1}
                size="sm"
                aria-label="Previous page"
              />
              <Text fontSize="sm" fontWeight="medium">
                Page {pageNumber} of {numPages}
              </Text>
              <IconButton
                icon={<FiChevronRight />}
                onClick={nextPage}
                isDisabled={pageNumber >= numPages}
                size="sm"
                aria-label="Next page"
              />
            </HStack>
            
            <Divider orientation="vertical" h={6} />
            
            <HStack>
              <IconButton
                icon={<FiZoomOut />}
                onClick={zoomOut}
                isDisabled={scale <= 0.5}
                size="sm"
                aria-label="Zoom out"
              />
              <Text fontSize="sm" fontWeight="medium" minW="60px" textAlign="center">
                {Math.round(scale * 100)}%
              </Text>
              <IconButton
                icon={<FiZoomIn />}
                onClick={zoomIn}
                isDisabled={scale >= 3.0}
                size="sm"
                aria-label="Zoom in"
              />
            </HStack>
          </HStack>
        </Box>
      )}

      {/* Content */}
      <Box>
        {canRenderNatively && extractedContent ? (
          <Tabs 
            colorScheme="blue" 
            index={viewMode === 'native' ? 0 : 1}
            onChange={(index) => setViewMode(index === 0 ? 'native' : 'text')}
          >
            <TabList px={4}>
              <Tab>Document View</Tab>
              <Tab>Text View</Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0}>
                <Box 
                  maxH="70vh" 
                  overflowY="auto" 
                  bg="gray.100"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  p={4}
                >
                  {viewerLoading && (
                    <Box textAlign="center" py={8}>
                      <Spinner size="xl" color="blue.500" />
                      <Text mt={4} color="gray.600">Rendering document...</Text>
                    </Box>
                  )}
                  
                  {!viewerLoading && fileType === 'pdf' && fileBlob && (
                    <Document
                      file={fileBlob}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={
                        <Box textAlign="center" py={8}>
                          <Spinner size="xl" color="blue.500" />
                          <Text mt={4} color="gray.600">Loading PDF...</Text>
                        </Box>
                      }
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </Document>
                  )}
                  
                  {!viewerLoading && (fileType === 'docx' || fileType === 'doc') && (
                    <Box
                      ref={docxContainerRef}
                      w="100%"
                      maxW="800px"
                      bg="white"
                      p={6}
                      rounded="md"
                      shadow="sm"
                      sx={{
                        '& .docx-wrapper': {
                          background: 'white',
                        },
                        '& .docx': {
                          background: 'white',
                        }
                      }}
                    />
                  )}
                </Box>
              </TabPanel>

              <TabPanel p={0}>
                <Box p={6} maxH="70vh" overflowY="auto">
                  {extractedContent ? (
                    <Box
                      bg="gray.50"
                      p={6}
                      rounded="md"
                      border="1px"
                      borderColor="gray.200"
                      fontFamily="mono"
                      fontSize="sm"
                      whiteSpace="pre-wrap"
                      color="gray.800"
                      lineHeight="tall"
                    >
                      {extractedContent}
                    </Box>
                  ) : (
                    <Box textAlign="center" py={8}>
                      <Text color="gray.500">
                        No text content available
                      </Text>
                    </Box>
                  )}
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        ) : (
          <Box p={6} maxH="70vh" overflowY="auto">
            {extractedContent ? (
              <Box
                bg="gray.50"
                p={6}
                rounded="md"
                border="1px"
                borderColor="gray.200"
                fontFamily="mono"
                fontSize="sm"
                whiteSpace="pre-wrap"
                color="gray.800"
                lineHeight="tall"
              >
                {extractedContent}
              </Box>
            ) : (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">
                  No text content could be extracted from this document
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DocumentViewer;