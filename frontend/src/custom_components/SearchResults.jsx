import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  Divider,
  Spinner,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { FiFile, FiEye, FiZap, FiTrash2 } from 'react-icons/fi';
import { formatFileSize, formatDate, getFileTypeColor } from '../utils/formatters';
import { documentsAPI } from '../utils/api';

const SearchResults = ({ results, query, searchTime, isLoading, onViewDocument, onSearchUpdate }) => {
  const [deleteId, setDeleteId] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleDeleteClick = (documentId) => {
    setDeleteId(documentId);
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    try {
      await documentsAPI.delete(deleteId);
      
      toast({
        title: 'Document deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Trigger search update to refresh results
      if (onSearchUpdate) {
        onSearchUpdate();
      }
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      onClose();
      setDeleteId(null);
    }
  };

  const canDelete = (doc) => {
    return currentUser.role === 'admin' || doc.uploaded_by_username === currentUser.username;
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  if (isLoading) {
    return (
      <Box bg="white" p={8} rounded="lg" shadow="md" textAlign="center">
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  if (!results || results.length === 0) {
    if (!query) {
      return null;
    }

    return (
      <Box bg="white" p={8} rounded="lg" shadow="md" textAlign="center">
        <Icon as={FiFile} boxSize={16} color="gray.300" />
        <Text mt={4} fontSize="lg" color="gray.600" fontWeight="medium">
          No results found for "{query}"
        </Text>
        <Text color="gray.500" fontSize="sm" mt={2}>
          Try different keywords or check your spelling
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Box bg="white" rounded="lg" shadow="md" overflow="hidden">
        {/* Header */}
        <Box p={4} bg="blue.50" borderBottom="1px" borderColor="blue.100">
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Icon as={FiZap} color="blue.600" />
              <Text fontWeight="bold" color="blue.900">
                Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </Text>
            </HStack>
            <Text fontSize="sm" color="blue.700">
              {searchTime}ms
            </Text>
          </HStack>
        </Box>

        {/* Results */}
        <VStack spacing={0} align="stretch" divider={<Divider />}>
          {results.map((result) => (
            <Box
              key={result.id}
              p={5}
              _hover={{ bg: 'gray.50' }}
              transition="background 0.2s"
            >
              <VStack align="stretch" spacing={3}>
                {/* Title and metadata */}
                <HStack justify="space-between" align="start">
                  <HStack spacing={3} flex={1}>
                    <Icon
                      as={FiFile}
                      boxSize={5}
                      color={`${getFileTypeColor(result.filename)}.500`}
                    />
                    <VStack align="start" spacing={1} flex={1}>
                      <Text fontWeight="bold" fontSize="lg" color="gray.800">
                        {result.filename}
                      </Text>
                      <HStack spacing={3} fontSize="sm" color="gray.600">
                        <Badge colorScheme={getFileTypeColor(result.filename)}>
                          {getFileExtension(result.filename)}
                        </Badge>
                        <Text>{formatFileSize(result.file_size)}</Text>
                        <Text>•</Text>
                        <Text>{result.page_count} {result.page_count === 1 ? 'page' : 'pages'}</Text>
                        <Text>•</Text>
                        <Badge colorScheme="purple" variant="subtle">
                          {result.uploaded_by_username}
                        </Badge>
                        <Text>•</Text>
                        <Text>{formatDate(result.uploaded_at)}</Text>
                      </HStack>
                    </VStack>
                  </HStack>

                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="ghost"
                      leftIcon={<FiEye />}
                      onClick={() => onViewDocument(result.id)}
                    >
                      View
                    </Button>
                    {canDelete(result) && (
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        leftIcon={<FiTrash2 />}
                        onClick={() => handleDeleteClick(result.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </HStack>
                </HStack>

                {/* Snippet */}
                {result.snippet && (
                  <Box
                    bg="gray.50"
                    p={3}
                    rounded="md"
                    fontSize="sm"
                    color="gray.700"
                    borderLeft="3px solid"
                    borderColor="blue.400"
                  >
                    <Text lineHeight="tall">{result.snippet}</Text>
                  </Box>
                )}
              </VStack>
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={isOpen} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Document
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConfirm} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default SearchResults;