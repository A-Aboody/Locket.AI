import { useState, useEffect } from 'react';
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
  Divider,
} from '@chakra-ui/react';
import { FiX, FiFile } from 'react-icons/fi';
import { documentsAPI } from '../utils/api';
import { formatFileSize, formatDate, getFileTypeColor } from '../utils/formatters';

const DocumentViewer = ({ documentId, onClose }) => {
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        
        // Fetch metadata
        const metaResponse = await documentsAPI.get(documentId);
        setDocument(metaResponse.data);
        
        // Fetch content
        const contentResponse = await documentsAPI.getContent(documentId);
        setContent(contentResponse.data.content);
        
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

    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

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
          <Button
            variant="ghost"
            leftIcon={<FiX />}
            onClick={onClose}
          >
            Close
          </Button>
        </HStack>
      </Box>

      {/* Content */}
      <Box p={6} maxH="600px" overflowY="auto">
        {content ? (
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
            {content}
          </Box>
        ) : (
          <Box textAlign="center" py={8}>
            <Text color="gray.500">
              No text content could be extracted from this document
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DocumentViewer;