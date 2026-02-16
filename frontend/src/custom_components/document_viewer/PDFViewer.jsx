import { useState, useRef, useCallback } from 'react';
import { Box, VStack, Spinner, Text, Button } from '@chakra-ui/react';
import { Document, Page } from 'react-pdf';

const BUFFER_PAGES = 2;

const PDFViewer = ({
  pdfFile,
  numPages,
  currentPage,
  scale,
  fitWidth,
  visiblePages,
  containerWidth,
  viewerLoading,
  scrollContainerRef,
  pageRefs,
  onDocumentLoadSuccess,
  onDocumentLoadError,
  onPageChange,
  onVisiblePagesChange,
  onDownload,
}) => {
  const getPageWidth = useCallback(() => {
    if (fitWidth) {
      return Math.max(containerWidth - 48, 400);
    }
    return 850 * scale;
  }, [fitWidth, containerWidth, scale]);

  return (
    <Box
      ref={scrollContainerRef}
      className="pdf-viewer-scrollable"
      h="full"
      overflowY="auto"
      overflowX="hidden"
      bg="#111316"
      display="flex"
      flexDirection="column"
      alignItems="center"
      sx={{
        scrollBehavior: 'auto',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'auto !important',
        scrollbarWidth: 'thin !important',
        scrollbarColor: '#3d4148 #090a0b !important',
        '&::-webkit-scrollbar': {
          display: 'block !important',
          width: '8px !important',
          background: '#1a1d21',
        },
        '&::-webkit-scrollbar-track': {
          background: '#1a1d21',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#3d4148',
          borderRadius: '4px',
          border: '1px solid #1a1d21',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#5a5f67',
        },
      }}
    >
      {viewerLoading && (
        <Box textAlign="center" py={12}>
          <Spinner size="xl" color="accent.500" thickness="4px" />
          <Text mt={4} color="gray.400">
            Rendering document...
          </Text>
        </Box>
      )}

      {!viewerLoading && pdfFile && (
        <Document
          file={pdfFile}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <Box textAlign="center" py={12}>
              <Spinner size="xl" color="accent.500" thickness="4px" />
              <Text mt={4} color="gray.400">
                Loading PDF...
              </Text>
            </Box>
          }
          error={
            <Box textAlign="center" py={12}>
              <Text color="red.400" fontSize="lg" fontWeight="bold">
                Failed to load PDF
              </Text>
              <Text color="gray.400" mt={2}>
                The document could not be displayed
              </Text>
              <Button mt={4} size="sm" onClick={onDownload} colorScheme="accent">
                Download Instead
              </Button>
            </Box>
          }
        >
          <VStack spacing={4} py={6}>
            {Array.from({ length: numPages || 0 }, (_, index) => {
              const pageNum = index + 1;
              const shouldRender = visiblePages.has(pageNum);

              return (
                <Box
                  key={`page_${pageNum}`}
                  ref={(el) => (pageRefs.current[pageNum] = el)}
                  data-page-number={pageNum}
                  bg="white"
                  boxShadow="0 2px 8px rgba(0,0,0,0.3)"
                  minH={shouldRender ? 'auto' : '800px'}
                >
                  {shouldRender ? (
                    <Page
                      pageNumber={pageNum}
                      width={getPageWidth()}
                      scale={fitWidth ? undefined : scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      loading={
                        <Box
                          p={8}
                          textAlign="center"
                          minH="800px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Spinner color="accent.500" />
                        </Box>
                      }
                    />
                  ) : (
                    <Box
                      minH="800px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="gray.400"
                    >
                      Page {pageNum}
                    </Box>
                  )}
                </Box>
              );
            })}
          </VStack>
        </Document>
      )}
    </Box>
  );
};

export default PDFViewer;
