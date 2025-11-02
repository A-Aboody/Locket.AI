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
  IconButton,
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
      <Box bg="primary.800" p={12} rounded="lg" border="1px" borderColor="primary.600" textAlign="center">
        <Spinner size="xl" color="accent.500" thickness="4px" />
        <Text mt={4} color="gray.400">Searching documents...</Text>
      </Box>
    );
  }

  if (!results || results.length === 0) {
    if (!query) {
      return null;
    }

    return (
      <Box bg="primary.800" p={12} rounded="lg" border="1px" borderColor="primary.600" textAlign="center">
        <Icon as={FiFile} boxSize={20} color="primary.500" />
        <Text mt={6} fontSize="xl" color="gray.300" fontWeight="semibold">
          No results found for "{query}"
        </Text>
        <Text color="gray.500" fontSize="md" mt={2}>
          Try different keywords or check your spelling
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Box bg="primary.800" rounded="lg" border="1px" borderColor="primary.600" overflow="hidden">
        {/* Header */}
        <Box p={5} bg="primary.700" borderBottom="1px" borderColor="primary.600">
          <HStack justify="space-between">
            <HStack spacing={3}>
              <Icon as={FiZap} color="accent.500" boxSize={5} />
              <Text fontWeight="bold" color="white" fontSize="lg">
                Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </Text>
            </HStack>
            <Badge colorScheme="accent" fontSize="sm" px={3} py={1}>
              {searchTime}ms
            </Badge>
          </HStack>
        </Box>

        {/* Results */}
        <VStack spacing={0} align="stretch" divider={<Divider borderColor="primary.600" />}>
          {results.map((result) => (
            <Box
              key={result.id}
              p={6}
              _hover={{ bg: 'primary.700' }}
              transition="background 0.2s"
            >
              <VStack align="stretch" spacing={4}>
                {/* Title and metadata */}
                <HStack justify="space-between" align="start">
                  <HStack spacing={4} flex={1}>
                    <Icon
                      as={FiFile}
                      boxSize={6}
                      color={`${getFileTypeColor(result.filename)}.400`}
                    />
                    <VStack align="start" spacing={2} flex={1}>
                      <Text fontWeight="bold" fontSize="lg" color="white">
                        {result.filename}
                      </Text>
                      <HStack spacing={3} fontSize="sm" color="gray.400" flexWrap="wrap">
                        <Badge colorScheme={getFileTypeColor(result.filename)} fontSize="xs">
                          {getFileExtension(result.filename)}
                        </Badge>
                        <Text>{formatFileSize(result.file_size)}</Text>
                        <Text>•</Text>
                        <Text>{result.page_count} {result.page_count === 1 ? 'page' : 'pages'}</Text>
                        <Text>•</Text>
                        <Text>{result.uploaded_by_username}</Text>
                        <Text>•</Text>
                        <Text>{formatDate(result.uploaded_at)}</Text>
                      </HStack>
                    </VStack>
                  </HStack>

                  <HStack spacing={2}>
                    <IconButton
                      icon={<FiEye />}
                      size="sm"
                      variant="ghost"
                      colorScheme="accent"
                      onClick={() => onViewDocument(result.id)}
                      aria-label="View document"
                      color="accent.400"
                      _hover={{ bg: 'accent.500', color: 'white' }}
                    />
                    {canDelete(result) && (
                      <IconButton
                        icon={<FiTrash2 />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleDeleteClick(result.id)}
                        aria-label="Delete document"
                        color="red.400"
                        _hover={{ bg: 'red.500', color: 'white' }}
                      />
                    )}
                  </HStack>
                </HStack>

                {/* Snippet */}
                {result.snippet && (
                  <Box
                    bg="primary.900"
                    p={4}
                    rounded="md"
                    fontSize="sm"
                    color="gray.300"
                    borderLeft="3px solid"
                    borderColor="accent.500"
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
          <AlertDialogContent bg="primary.800" border="1px" borderColor="primary.600">
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
              Delete Document
            </AlertDialogHeader>

            <AlertDialogBody color="gray.300">
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={onClose} variant="ghost" color="gray.400">
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                ml={3}
                bg="red.500"
                _hover={{ bg: 'red.600' }}
              >
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