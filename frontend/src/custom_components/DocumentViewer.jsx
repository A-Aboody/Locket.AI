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
import { renderAsync } from 'docx-preview';
import { documentsAPI } from '../utils/api';
import { formatFileSize, formatDate, getFileTypeColor } from '../utils/formatters';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DocumentViewer = ({ documentId, onClose }) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerLoading, setViewerLoading] = useState(false);
  const toast = useToast();
  
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  
  const [fileBlob, setFileBlob] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [extractedContent, setExtractedContent] = useState('');
  
  const docxContainerRef = useRef(null);
  const [viewMode, setViewMode] = useState('native');

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      
      const metaResponse = await documentsAPI.get(documentId);
      const docData = metaResponse.data;
      setDocument(docData);
      
      const extension = docData.filename.split('.').pop().toLowerCase();
      setFileType(extension);
      
      try {
        const contentResponse = await documentsAPI.getContent(documentId);
        setExtractedContent(contentResponse.data.content);
      } catch (err) {
        console.warn('Could not fetch extracted content:', err);
      }
      
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
      <Box bg="primary.800" p={12} rounded="lg" border="1px" borderColor="primary.600" textAlign="center">
        <Spinner size="xl" color="accent.500" thickness="4px" />
        <Text mt={4} color="gray.400">Loading document...</Text>
      </Box>
    );
  }

  if (!document) {
    return null;
  }

  const canRenderNatively = ['pdf', 'docx', 'doc'].includes(fileType);

  return (
    <Box bg="primary.800" rounded="lg" border="1px" borderColor="primary.600" overflow="hidden">
      {/* Header */}
      <Box bg="primary.700" p={4} borderBottom="1px" borderColor="primary.600">
        <HStack justify="space-between">
          <HStack spacing={4}>
            <Icon as={FiFile} boxSize={6} color={`${getFileTypeColor(document.filename)}.400`} />
            <VStack align="start" spacing={1}>
              <Text fontWeight="bold" fontSize="lg" color="white">
                {document.filename}
              </Text>
              <HStack spacing={3} fontSize="sm" color="gray.400">
                <Badge colorScheme={getFileTypeColor(document.filename)} fontSize="xs">
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
              colorScheme="accent"
              variant="ghost"
              color="accent.400"
              _hover={{ bg: 'accent.500', color: 'white' }}
            >
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<FiX />}
              onClick={onClose}
              color="gray.400"
              _hover={{ color: 'white', bg: 'primary.600' }}
            >
              Close
            </Button>
          </HStack>
        </HStack>
      </Box>

      {/* Viewer Controls (for PDF) */}
      {fileType === 'pdf' && viewMode === 'native' && numPages && (
        <Box bg="primary.900" p={3} borderBottom="1px" borderColor="primary.600">
          <HStack justify="center" spacing={6}>
            <HStack>
              <IconButton
                icon={<FiChevronLeft />}
                onClick={previousPage}
                isDisabled={pageNumber <= 1}
                size="sm"
                aria-label="Previous page"
                variant="ghost"
                color="gray.400"
                _hover={{ bg: 'primary.700', color: 'white' }}
              />
              <Text fontSize="sm" fontWeight="medium" color="gray.300" minW="120px" textAlign="center">
                Page {pageNumber} of {numPages}
              </Text>
              <IconButton
                icon={<FiChevronRight />}
                onClick={nextPage}
                isDisabled={pageNumber >= numPages}
                size="sm"
                aria-label="Next page"
                variant="ghost"
                color="gray.400"
                _hover={{ bg: 'primary.700', color: 'white' }}
              />
            </HStack>
            
            <Divider orientation="vertical" h={6} borderColor="primary.600" />
            
            <HStack>
              <IconButton
                icon={<FiZoomOut />}
                onClick={zoomOut}
                isDisabled={scale <= 0.5}
                size="sm"
                aria-label="Zoom out"
                variant="ghost"
                color="gray.400"
                _hover={{ bg: 'primary.700', color: 'white' }}
              />
              <Text fontSize="sm" fontWeight="medium" minW="60px" textAlign="center" color="gray.300">
                {Math.round(scale * 100)}%
              </Text>
              <IconButton
                icon={<FiZoomIn />}
                onClick={zoomIn}
                isDisabled={scale >= 3.0}
                size="sm"
                aria-label="Zoom in"
                variant="ghost"
                color="gray.400"
                _hover={{ bg: 'primary.700', color: 'white' }}
              />
            </HStack>
          </HStack>
        </Box>
      )}

      {/* Content */}
      <Box>
        {canRenderNatively && extractedContent ? (
          <Tabs 
            colorScheme="accent" 
            index={viewMode === 'native' ? 0 : 1}
            onChange={(index) => setViewMode(index === 0 ? 'native' : 'text')}
            variant="line"
          >
            <TabList px={4} bg="primary.900" borderBottom="1px" borderColor="primary.600">
              <Tab color="gray.400" _selected={{ color: 'accent.500', borderColor: 'accent.500' }}>
                Document View
              </Tab>
              <Tab color="gray.400" _selected={{ color: 'accent.500', borderColor: 'accent.500' }}>
                Text View
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0}>
                <Box 
                  maxH="70vh" 
                  overflowY="auto" 
                  bg="primary.900"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  p={4}
                >
                  {viewerLoading && (
                    <Box textAlign="center" py={12}>
                      <Spinner size="xl" color="accent.500" thickness="4px" />
                      <Text mt={4} color="gray.400">Rendering document...</Text>
                    </Box>
                  )}
                  
                  {!viewerLoading && fileType === 'pdf' && fileBlob && (
                    <Document
                      file={fileBlob}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={
                        <Box textAlign="center" py={12}>
                          <Spinner size="xl" color="accent.500" thickness="4px" />
                          <Text mt={4} color="gray.400">Loading PDF...</Text>
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
                    />
                  )}
                </Box>
              </TabPanel>

              <TabPanel p={0}>
                <Box p={6} maxH="70vh" overflowY="auto" bg="primary.900">
                  {extractedContent ? (
                    <Box
                      bg="primary.800"
                      p={6}
                      rounded="md"
                      border="1px"
                      borderColor="primary.600"
                      fontFamily="mono"
                      fontSize="sm"
                      whiteSpace="pre-wrap"
                      color="gray.300"
                      lineHeight="tall"
                    >
                      {extractedContent}
                    </Box>
                  ) : (
                    <Box textAlign="center" py={12}>
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
          <Box p={6} maxH="70vh" overflowY="auto" bg="primary.900">
            {extractedContent ? (
              <Box
                bg="primary.800"
                p={6}
                rounded="md"
                border="1px"
                borderColor="primary.600"
                fontFamily="mono"
                fontSize="sm"
                whiteSpace="pre-wrap"
                color="gray.300"
                lineHeight="tall"
              >
                {extractedContent}
              </Box>
            ) : (
              <Box textAlign="center" py={12}>
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