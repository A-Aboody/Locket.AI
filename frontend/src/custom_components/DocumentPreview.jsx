import { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Spinner,
  Divider,
  Button,
  useToast,
  Image,
} from '@chakra-ui/react';
import { FiFile, FiX, FiDownload, FiEye } from 'react-icons/fi';
import { Document, Page, pdfjs } from 'react-pdf';
import { documentsAPI } from '../utils/api';
import { formatFileSize, formatDate, getFileTypeColor } from '../utils/formatters';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DocumentPreview = ({ documentId, onClose, onViewDocument }) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileBlob, setFileBlob] = useState(null);
  const [fileType, setFileType] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (documentId) {
      fetchDocument();
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
        bg="primary.800"
        borderRight="1px"
        borderColor="primary.600"
        p={6}
        h="full"
      >
        <VStack spacing={4} align="center" justify="center" h="full">
          <Spinner size="xl" color="accent.500" thickness="4px" />
          <Text color="gray.400">Loading preview...</Text>
        </VStack>
      </Box>
    );
  }

  if (!document) return null;

  return (
    <Box
      w="350px"
      bg="primary.800"
      borderRight="1px"
      borderLeft="1px"
      borderColor="primary.600"
      h="full"
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <HStack justify="space-between" p={4} borderBottom="1px" borderColor="primary.600">
        <Text fontSize="lg" fontWeight="bold" color="white">
          Document Preview
        </Text>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          leftIcon={<FiX />}
          color="gray.400"
          _hover={{ color: 'white', bg: 'primary.700' }}
        >
          Close
        </Button>
      </HStack>

      {/* Content */}
      <VStack spacing={6} p={6} align="stretch" flex={1} overflowY="auto">
        {/* Document Preview/Thumbnail */}
        <Box textAlign="center" py={2}>
          <Box
            bg="primary.700"
            rounded="lg"
            p={4}
            border="2px solid"
            borderColor="primary.600"
            position="relative"
            minH="200px"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {fileType === 'pdf' && fileBlob ? (
              <Box maxW="100%" maxH="200px" overflow="hidden">
                <Document
                  file={fileBlob}
                  loading={
                    <VStack>
                      <Spinner size="md" color="accent.500" />
                      <Text fontSize="xs" color="gray.500">Loading PDF...</Text>
                    </VStack>
                  }
                >
                  <Page
                    pageNumber={1}
                    width={250}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              </Box>
            ) : ['png', 'jpg', 'jpeg'].includes(fileType) && fileBlob ? (
              <Image
                src={URL.createObjectURL(fileBlob)}
                alt={document.filename}
                maxH="200px"
                maxW="100%"
                objectFit="contain"
              />
            ) : (
              <Icon
                as={FiFile}
                boxSize={16}
                color={`${getFileTypeColor(document.filename)}.400`}
              />
            )}
          </Box>
        </Box>

        {/* Document Info */}
        <VStack spacing={3} align="stretch">
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              NAME
            </Text>
            <Text fontSize="md" color="white" fontWeight="semibold" wordBreak="break-word">
              {document.filename}
            </Text>
          </Box>

          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              UPLOADED BY
            </Text>
            <Text fontSize="md" color="gray.300">
              {document.uploaded_by_username}
            </Text>
          </Box>

          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              TYPE
            </Text>
            <Badge
              colorScheme={getFileTypeColor(document.filename)}
              fontSize="sm"
              px={3}
              py={1}
            >
              {getFileExtension(document.filename)}
            </Badge>
          </Box>

          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              SIZE
            </Text>
            <Text fontSize="md" color="gray.300">
              {formatFileSize(document.file_size)}
            </Text>
          </Box>

          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              DATE
            </Text>
            <Text fontSize="md" color="gray.300">
              {formatDate(document.uploaded_at)}
            </Text>
          </Box>
        </VStack>

        <Divider borderColor="primary.600" />

        {/* Summary Section - Placeholder */}
        <Box>
          <Text fontSize="sm" color="gray.500" mb={3} fontWeight="semibold">
            SUMMARY
          </Text>
          <Text fontSize="sm" color="gray.400" lineHeight="tall" fontStyle="italic">
            AI-generated summary will appear here in a future update.
          </Text>
        </Box>

        {/* Action Buttons */}
        <VStack spacing={3} mt="auto">
          <Button
            colorScheme="accent"
            leftIcon={<FiEye />}
            onClick={onViewDocument}
            size="md"
            w="full"
            bg="accent.500"
            _hover={{ bg: 'accent.600' }}
          >
            View Document
          </Button>
          
          <Button
            variant="outline"
            leftIcon={<FiDownload />}
            onClick={handleDownload}
            size="md"
            w="full"
            borderColor="accent.500"
            color="accent.500"
            _hover={{ bg: 'accent.500', color: 'white' }}
          >
            Download
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
};

export default DocumentPreview;