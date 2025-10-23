import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
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
} from '@chakra-ui/react';
import { FiFile, FiEye, FiTrash2 } from 'react-icons/fi';
import { documentsAPI } from '../utils/api';
import { formatFileSize, formatDate, getFileTypeColor } from '../utils/formatters';

const DocumentList = ({ refreshTrigger, onViewDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.list();
      setDocuments(response.data);
    } catch (error) {
      toast({
        title: 'Failed to load documents',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

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

      // Refresh list
      fetchDocuments();
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

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  if (loading) {
    return (
      <Box bg="white" p={8} rounded="lg" shadow="md" textAlign="center">
        <Spinner size="xl" color="blue.500" />
        <Text mt={4} color="gray.600">Loading documents...</Text>
      </Box>
    );
  }

  if (documents.length === 0) {
    return (
      <Box bg="white" p={8} rounded="lg" shadow="md" textAlign="center">
        <Icon as={FiFile} boxSize={16} color="gray.300" />
        <Text mt={4} fontSize="lg" color="gray.600">
          No documents uploaded yet
        </Text>
        <Text color="gray.500" fontSize="sm">
          Upload your first document to get started
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Box bg="white" rounded="lg" shadow="md" overflow="hidden">
        <Box p={6} borderBottom="1px" borderColor="gray.200">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold" color="gray.800">
              All Documents
            </Text>
            <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
              {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
            </Badge>
          </HStack>
        </Box>

        <Box overflowX="auto">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Document</Th>
                <Th>Type</Th>
                <Th>Size</Th>
                <Th>Pages</Th>
                <Th>Uploaded By</Th>
                <Th>Uploaded</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {documents.map((doc) => (
                <Tr key={doc.id} _hover={{ bg: 'gray.50' }}>
                  <Td>
                    <HStack spacing={3}>
                      <Icon as={FiFile} boxSize={5} color={`${getFileTypeColor(doc.filename)}.500`} />
                      <Text fontWeight="medium" color="gray.800">
                        {doc.filename}
                      </Text>
                    </HStack>
                  </Td>
                  <Td>
                    <Badge colorScheme={getFileTypeColor(doc.filename)}>
                      {getFileExtension(doc.filename)}
                    </Badge>
                  </Td>
                  <Td>
                    <Text color="gray.600">{formatFileSize(doc.file_size)}</Text>
                  </Td>
                  <Td>
                    <Text color="gray.600">{doc.page_count}</Text>
                  </Td>
                  <Td>
                    <Badge colorScheme="purple" variant="subtle">
                      {doc.uploaded_by_username}
                    </Badge>
                  </Td>
                  <Td>
                    <Text color="gray.600" fontSize="sm">
                      {formatDate(doc.uploaded_at)}
                    </Text>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        leftIcon={<FiEye />}
                        onClick={() => onViewDocument(doc.id)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        leftIcon={<FiTrash2 />}
                        onClick={() => handleDeleteClick(doc.id)}
                      >
                        Delete
                      </Button>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
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

export default DocumentList;