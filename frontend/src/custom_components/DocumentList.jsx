import { useState } from 'react';
import {
  Box,
  HStack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Icon,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Spinner,
  IconButton,
  Button,
} from '@chakra-ui/react';
import { FiFile, FiEye, FiTrash2 } from 'react-icons/fi';
import { documentsAPI } from '../utils/api';
import { formatFileSize, formatDate, getFileTypeColor } from '../utils/formatters';

const DocumentList = ({ documents = [], onViewDocument, onDelete, emptyMessage = 'No documents found', loading = false }) => {
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

      if (onDelete) {
        onDelete();
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

  if (loading) {
    return (
      <Box bg="primary.800" p={8} rounded="lg" border="1px" borderColor="primary.600" textAlign="center">
        <Spinner size="xl" color="accent.500" thickness="4px" />
        <Text mt={4} color="gray.400">Loading documents...</Text>
      </Box>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Box bg="primary.800" p={12} rounded="lg" border="1px" borderColor="primary.600" textAlign="center">
        <Icon as={FiFile} boxSize={20} color="primary.500" />
        <Text mt={6} fontSize="xl" color="gray.300" fontWeight="semibold">
          {emptyMessage}
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Box bg="primary.800" rounded="lg" border="1px" borderColor="primary.600" overflow="hidden">
        <Box overflowX="auto">
          <Table variant="simple" size="md">
            <Thead bg="primary.700">
              <Tr>
                <Th color="gray.400" borderColor="primary.600">Name</Th>
                <Th color="gray.400" borderColor="primary.600">Date Uploaded</Th>
                <Th color="gray.400" borderColor="primary.600">Type</Th>
                <Th color="gray.400" borderColor="primary.600">User Group</Th>
                <Th color="gray.400" borderColor="primary.600">Size</Th>
                <Th color="gray.400" borderColor="primary.600">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {documents.map((doc) => (
                <Tr key={doc.id} _hover={{ bg: 'primary.700' }} transition="background 0.2s">
                  <Td borderColor="primary.600">
                    <HStack spacing={3}>
                      <Icon as={FiFile} boxSize={5} color="gray.400" />
                      <Text color="gray.200" fontWeight="medium">
                        {doc.filename}
                      </Text>
                    </HStack>
                  </Td>
                  <Td borderColor="primary.600">
                    <Text color="gray.300" fontSize="sm">
                      {formatDate(doc.uploaded_at)}
                    </Text>
                  </Td>
                  <Td borderColor="primary.600">
                    <Badge
                      colorScheme={getFileTypeColor(doc.filename)}
                      fontSize="xs"
                      px={2}
                      py={1}
                    >
                      {getFileExtension(doc.filename)}
                    </Badge>
                  </Td>
                  <Td borderColor="primary.600">
                    <Text color="gray.300" fontSize="sm">
                      {doc.uploaded_by_username}
                    </Text>
                  </Td>
                  <Td borderColor="primary.600">
                    <Text color="gray.300" fontSize="sm">
                      {formatFileSize(doc.file_size)}
                    </Text>
                  </Td>
                  <Td borderColor="primary.600">
                    <HStack spacing={1}>
                      <IconButton
                        icon={<FiEye />}
                        size="sm"
                        variant="ghost"
                        colorScheme="accent"
                        onClick={() => onViewDocument(doc.id)}
                        aria-label="View document"
                        color="accent.400"
                        _hover={{ bg: 'accent.500', color: 'white' }}
                      />
                      {canDelete(doc) && (
                        <IconButton
                          icon={<FiTrash2 />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDeleteClick(doc.id)}
                          aria-label="Delete document"
                          color="red.400"
                          _hover={{ bg: 'red.500', color: 'white' }}
                        />
                      )}
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>

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

export default DocumentList;