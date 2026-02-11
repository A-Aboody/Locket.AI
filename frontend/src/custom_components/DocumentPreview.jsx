import { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Spinner,
  Button,
  useToast,
  Image,
} from '@chakra-ui/react';
import { FiFile, FiX, FiDownload, FiEye } from 'react-icons/fi';
import { Document, Page, pdfjs } from 'react-pdf';
import { documentsAPI } from '../utils/api';
import { formatFileSize, formatDate } from '../utils/formatters';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use local worker file for Electron compatibility
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs/pdf.worker.min.mjs',
  window.location.href
).toString();

const DocumentPreview = ({ documentId, onClose, onViewDocument }) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileBlob, setFileBlob] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (documentId) {
      fetchDocument();
      fetchSummary();
    }
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.get(documentId);
      const docData = response.data;
      setDocument(docData);

      const extension = docData.filename.split('.').pop().toLowerCase();
      setFileType(extension);

      if (['pdf', 'png', 'jpg', 'jpeg'].includes(extension)) {
        const fileResponse = await documentsAPI.downloadFile(documentId);
        setFileBlob(fileResponse.data);
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

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const response = await documentsAPI.getSummary(documentId);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to load summary:', error);
      setSummaryError(error.response?.data?.detail || 'Failed to generate summary');
    } finally {
      setSummaryLoading(false);
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

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  if (!documentId) return null;

  if (loading) {
    return (
      <Box
        w="350px"
        bg="primary.900"
        borderLeft="1px"
        borderColor="primary.600"
        p={6}
        h="full"
      >
        <VStack spacing={3} align="center" justify="center" h="full">
          <Spinner size="lg" color="accent.500" thickness="2px" />
          <Text color="gray.500" fontSize="sm">Loading...</Text>
        </VStack>
      </Box>
    );
  }

  if (!document) return null;

  return (
    <Box
      w="350px"
      bg="primary.900"
      borderLeft="1px solid"
      borderColor="primary.600"
      h="full"
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      {/* Header */}
      <HStack justify="space-between" px={4} py={3} borderBottom="1px" borderColor="primary.600" flexShrink={0}>
        <Text fontSize="md" fontWeight="600" color="white" letterSpacing="-0.01em">
          Preview
        </Text>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          color="gray.500"
          rounded="md"
          _hover={{ color: 'white', bg: 'primary.700' }}
          minW="auto"
          px={2}
        >
          <FiX size={16} />
        </Button>
      </HStack>

      {/* Content */}
      <VStack spacing={0} align="stretch" flex={1} overflowY="auto">
        {/* Document Preview/Thumbnail */}
        <Box p={6} borderBottom="1px" borderColor="primary.600">
          <Box
            bg="primary.800"
            rounded="md"
            p={4}
            border="1px"
            borderColor="primary.600"
            position="relative"
            minH="180px"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {fileType === 'pdf' && fileBlob ? (
              <Box maxW="100%" maxH="180px" overflow="hidden">
                <Document
                  file={fileBlob}
                  loading={
                    <VStack spacing={2}>
                      <Spinner size="sm" color="accent.500" thickness="2px" />
                      <Text fontSize="xs" color="gray.500">Loading...</Text>
                    </VStack>
                  }
                >
                  <Page
                    pageNumber={1}
                    width={240}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              </Box>
            ) : ['png', 'jpg', 'jpeg'].includes(fileType) && fileBlob ? (
              <Image
                src={URL.createObjectURL(fileBlob)}
                alt={document.filename}
                maxH="180px"
                maxW="100%"
                objectFit="contain"
              />
            ) : (
              <Icon
                as={FiFile}
                boxSize={12}
                color="gray.600"
              />
            )}
          </Box>
        </Box>

        {/* Document Info */}
        <VStack spacing={0} align="stretch" px={6} py={5} borderBottom="1px" borderColor="primary.600">
          <Box mb={4}>
            <Text fontSize="xs" color="white" mb={1.5} fontWeight="600">
              Filename
            </Text>
            <Text fontSize="sm" color="gray.400" wordBreak="break-word">
              {document.filename}
            </Text>
          </Box>

          <HStack spacing={6} fontSize="xs">
            <Box>
              <Text mb={1} color="white" fontWeight="600">Type</Text>
              <Badge
                bg="primary.700"
                color="gray.400"
                fontSize="xs"
                px={2}
                py={0.5}
                rounded="sm"
                fontWeight="500"
              >
                {getFileExtension(document.filename)}
              </Badge>
            </Box>
            <Box>
              <Text mb={1} color="white" fontWeight="600">Size</Text>
              <Text color="gray.400" fontSize="sm">
                {formatFileSize(document.file_size)}
              </Text>
            </Box>
          </HStack>

          <Box mt={4}>
            <Text fontSize="xs" color="white" mb={1.5} fontWeight="600">
              Uploaded by
            </Text>
            <Text fontSize="sm" color="gray.400">
              {document.uploaded_by_username}
            </Text>
          </Box>

          <Box mt={3}>
            <Text fontSize="xs" color="white" mb={1.5} fontWeight="600">
              Date
            </Text>
            <Text fontSize="sm" color="gray.400">
              {formatDate(document.uploaded_at)}
            </Text>
          </Box>
        </VStack>

        {/* AI Summary Section */}
        <Box px={6} py={5} borderBottom="1px" borderColor="primary.600" flex={1}>
          <Text fontSize="xs" color="white" fontWeight="600" mb={3}>
            AI Summary
          </Text>

          {summaryLoading ? (
            <HStack spacing={2} py={2}>
              <Spinner size="sm" color="accent.500" thickness="2px" />
              <Text fontSize="sm" color="gray.500">
                Generating...
              </Text>
            </HStack>
          ) : summaryError ? (
            <Box
              p={3}
              bg="primary.800"
              border="1px"
              borderColor="red.900"
              rounded="md"
            >
              <Text fontSize="sm" color="red.400">
                {summaryError}
              </Text>
            </Box>
          ) : summary && summary.summary ? (
            <Box>
              <Text
                fontSize="sm"
                color="gray.400"
                lineHeight="1.6"
              >
                {summary.summary}
              </Text>
            </Box>
          ) : (
            <Text fontSize="sm" color="gray.600">
              No summary available
            </Text>
          )}
        </Box>

        {/* Action Buttons */}
        <VStack spacing={2} p={6}>
          <Button
            bg="accent.500"
            color="white"
            leftIcon={<FiEye size={16} />}
            onClick={onViewDocument}
            size="md"
            w="full"
            rounded="md"
            fontWeight="500"
            _hover={{ bg: 'accent.600' }}
            _active={{ bg: 'accent.700' }}
            transition="all 0.15s"
          >
            Open
          </Button>

          <Button
            variant="ghost"
            leftIcon={<FiDownload size={16} />}
            onClick={handleDownload}
            size="md"
            w="full"
            rounded="md"
            fontWeight="500"
            color="gray.400"
            _hover={{ bg: 'primary.700', color: 'white' }}
            transition="all 0.15s"
          >
            Download
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
};

export default DocumentPreview;