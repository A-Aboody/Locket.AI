import { useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
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
  SimpleGrid,
  Card,
  CardBody,
  Tooltip,
  Center,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
} from '@chakra-ui/react';
import { 
  FiFile, 
  FiEye, 
  FiTrash2, 
  FiDownload, 
  FiUser, 
  FiCalendar,
  FiFileText,
  FiUsers,
  FiEyeOff,
  FiGlobe,
  FiClock,
} from 'react-icons/fi';
import { documentsAPI } from '../utils/api';
import { formatFileSize, formatDate, getFileTypeColor } from '../utils/formatters';

const DocumentList = ({ 
  documents = [], 
  onViewDocument, 
  onDelete, 
  emptyMessage = 'No documents found', 
  loading = false,
  viewMode = 'card',
}) => {
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleDeleteClick = (documentId, documentName) => {
    setDeleteId(documentId);
    setDeleteName(documentName);
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    try {
      await documentsAPI.delete(deleteId);
      
      toast({
        title: 'Document deleted',
        description: `${deleteName} has been removed`,
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
      setDeleteName('');
    }
  };

  const canDelete = (doc) => {
    return currentUser.role === 'admin' || doc.uploaded_by_username === currentUser.username;
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    if (ext === 'pdf') return { icon: FiFileText, color: 'red.400' };
    if (ext === 'doc' || ext === 'docx') return { icon: FiFileText, color: 'blue.400' };
    if (ext === 'txt') return { icon: FiFileText, color: 'gray.400' };
    return { icon: FiFile, color: 'accent.400' };
  };

  const getVisibilityDisplay = (doc) => {
    if (doc.visibility === 'group' && doc.user_group_name) {
      return {
        icon: FiUsers,
        text: doc.user_group_name,
        color: 'accent.400',
      };
    }
    if (doc.visibility === 'public') {
      return {
        icon: FiGlobe,
        text: 'Everyone',
        color: 'green.400',
      };
    }
    return {
      icon: FiEyeOff,
      text: 'Only me',
      color: 'gray.500',
    };
  };

  const handleDownload = (documentId) => {
    const url = documentsAPI.getFileUrl(documentId);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Center py={20}>
        <VStack spacing={4}>
          <Spinner size="xl" color="accent.500" thickness="3px" />
          <Text color="gray.400">Loading documents...</Text>
        </VStack>
      </Center>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Center py={20}>
        <VStack spacing={4}>
          <Box 
            p={6} 
            bg="primary.800" 
            rounded="full"
            border="2px dashed"
            borderColor="primary.600"
          >
            <FiFile size={48} color="#4A5568" />
          </Box>
          <Text fontSize="lg" color="white" fontWeight="medium">
            {emptyMessage}
          </Text>
          <Text color="gray.400" fontSize="sm" textAlign="center" maxW="300px">
            Upload your first document to get started
          </Text>
        </VStack>
      </Center>
    );
  }

  // Card View - Minimalistic Style
  if (viewMode === 'card') {
    return (
      <>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {documents.map((doc) => {
            const fileIconData = getFileIcon(doc.filename);
            const visibilityDisplay = getVisibilityDisplay(doc);
            const isHovered = hoveredCard === doc.id;
            
            return (
              <Card
                key={doc.id}
                bg="primary.800"
                border="1px"
                borderColor={isHovered ? 'accent.500' : 'primary.600'}
                transition="all 0.2s"
                cursor="pointer"
                onClick={() => onViewDocument(doc.id)}
                onMouseEnter={() => setHoveredCard(doc.id)}
                onMouseLeave={() => setHoveredCard(null)}
                _hover={{
                  borderColor: 'accent.500',
                  transform: 'translateY(-2px)',
                }}
              >
                <CardBody p={4}>
                  <VStack align="stretch" spacing={3}>
                    {/* Header with Icon and Actions */}
                    <HStack justify="space-between">
                      <Box 
                        p={2.5} 
                        bg="primary.700" 
                        rounded="md"
                        border="1px"
                        borderColor="primary.600"
                      >
                        <Icon as={fileIconData.icon} boxSize={5} color={fileIconData.color} />
                      </Box>
                      <HStack 
                        spacing={1} 
                        onClick={(e) => e.stopPropagation()}
                        opacity={isHovered ? 1 : 0}
                        transition="opacity 0.2s"
                      >
                        <Tooltip label="View">
                          <IconButton
                            icon={<FiEye />}
                            size="xs"
                            variant="ghost"
                            color="gray.400"
                            onClick={() => onViewDocument(doc.id)}
                            aria-label="View document"
                            _hover={{ color: 'accent.400', bg: 'primary.700' }}
                          />
                        </Tooltip>
                        <Tooltip label="Download">
                          <IconButton
                            icon={<FiDownload />}
                            size="xs"
                            variant="ghost"
                            color="gray.400"
                            onClick={() => handleDownload(doc.id)}
                            aria-label="Download document"
                            _hover={{ color: 'white', bg: 'primary.700' }}
                          />
                        </Tooltip>
                        {canDelete(doc) && (
                          <Tooltip label="Delete">
                            <IconButton
                              icon={<FiTrash2 />}
                              size="xs"
                              variant="ghost"
                              color="gray.400"
                              onClick={() => handleDeleteClick(doc.id, doc.filename)}
                              aria-label="Delete document"
                              _hover={{ color: 'red.400', bg: 'primary.700' }}
                            />
                          </Tooltip>
                        )}
                      </HStack>
                    </HStack>

                    {/* Filename */}
                    <VStack align="start" spacing={1}>
                      <Text 
                        color="white" 
                        fontWeight="medium" 
                        fontSize="sm"
                        noOfLines={2}
                        lineHeight="short"
                        minH="32px"
                      >
                        {doc.filename}
                      </Text>
                      <Text color="gray.500" fontSize="xs">
                        {getFileExtension(doc.filename)} • {formatFileSize(doc.file_size)}
                      </Text>
                    </VStack>

                    <Divider borderColor="primary.600" />

                    {/* Metadata */}
                    <VStack align="stretch" spacing={2} fontSize="xs">
                      {/* Shared With */}
                      <HStack spacing={2} color="gray.400">
                        <Icon as={visibilityDisplay.icon} boxSize={3} color={visibilityDisplay.color} />
                        <Text>{visibilityDisplay.text}</Text>
                      </HStack>

                      {/* Uploaded By */}
                      <HStack spacing={2} color="gray.400">
                        <Icon as={FiUser} boxSize={3} />
                        <Text>{doc.uploaded_by_username}</Text>
                      </HStack>

                      {/* Date */}
                      <HStack spacing={2} color="gray.400">
                        <Icon as={FiClock} boxSize={3} />
                        <Text>{formatDate(doc.uploaded_at)}</Text>
                      </HStack>
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>

        {/* Delete Dialog */}
        <AlertDialog isOpen={isOpen} onClose={onClose} isCentered>
          <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
          <AlertDialogContent bg="primary.800" border="1px" borderColor="red.500" mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
              <HStack spacing={3}>
                <Box p={2} bg="red.500" rounded="lg">
                  <FiTrash2 size={20} color="white" />
                </Box>
                <Text>Delete Document</Text>
              </HStack>
            </AlertDialogHeader>

            <AlertDialogBody color="gray.300">
              <VStack align="start" spacing={3}>
                <Text>
                  Are you sure you want to delete <Text as="span" fontWeight="bold" color="white">{deleteName}</Text>?
                </Text>
                <Box 
                  p={3} 
                  bg="red.900" 
                  border="1px" 
                  borderColor="red.700" 
                  rounded="md"
                  w="full"
                >
                  <Text fontSize="sm" color="red.200">
                    This action cannot be undone.
                  </Text>
                </Box>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button 
                onClick={onClose} 
                variant="ghost" 
                color="gray.400"
                _hover={{ bg: 'primary.700' }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                ml={3}
                leftIcon={<FiTrash2 />}
              >
                Delete Document
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // List View - Minimalistic File Explorer Style
  return (
    <>
      <Box 
        bg="primary.800" 
        rounded="lg" 
        border="1px" 
        borderColor="primary.600" 
        overflow="hidden"
      >
        <Table variant="unstyled" size="sm">
          <Thead>
            <Tr bg="primary.700" borderBottom="1px" borderColor="primary.600">
              <Th 
                color="gray.400" 
                fontSize="xs" 
                textTransform="none" 
                fontWeight="medium"
                py={3}
                px={4}
              >
                Name
              </Th>
              <Th 
                color="gray.400" 
                fontSize="xs" 
                textTransform="none" 
                fontWeight="medium"
                py={3}
                px={4}
              >
                Shared With
              </Th>
              <Th 
                color="gray.400" 
                fontSize="xs" 
                textTransform="none" 
                fontWeight="medium"
                py={3}
                px={4}
              >
                Uploaded By
              </Th>
              <Th 
                color="gray.400" 
                fontSize="xs" 
                textTransform="none" 
                fontWeight="medium"
                py={3}
                px={4}
              >
                Date Modified
              </Th>
              <Th 
                color="gray.400" 
                fontSize="xs" 
                textTransform="none" 
                fontWeight="medium"
                py={3}
                px={4}
                isNumeric
              >
                Size
              </Th>
              <Th 
                color="gray.400" 
                fontSize="xs" 
                textTransform="none" 
                fontWeight="medium"
                py={3}
                px={4}
                w="120px"
              >
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {documents.map((doc) => {
              const fileIconData = getFileIcon(doc.filename);
              const visibilityDisplay = getVisibilityDisplay(doc);
              const isHovered = hoveredRow === doc.id;
              
              return (
                <Tr 
                  key={doc.id} 
                  bg={isHovered ? 'primary.700' : 'transparent'}
                  transition="background 0.15s"
                  cursor="pointer"
                  onClick={() => onViewDocument(doc.id)}
                  onMouseEnter={() => setHoveredRow(doc.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  borderBottom="1px"
                  borderColor="primary.600"
                  _last={{ borderBottom: 'none' }}
                >
                  <Td py={3} px={4}>
                    <HStack spacing={3}>
                      <Icon 
                        as={fileIconData.icon} 
                        boxSize={4} 
                        color={fileIconData.color} 
                      />
                      <Text 
                        color="gray.200" 
                        fontSize="sm"
                        fontWeight="normal"
                        noOfLines={1}
                        maxW="400px"
                      >
                        {doc.filename}
                      </Text>
                    </HStack>
                  </Td>
                  <Td py={3} px={4}>
                    <HStack spacing={2}>
                      <Icon as={visibilityDisplay.icon} boxSize={3} color={visibilityDisplay.color} />
                      <Text color="gray.400" fontSize="sm" fontWeight="normal">
                        {visibilityDisplay.text}
                      </Text>
                    </HStack>
                  </Td>
                  <Td py={3} px={4}>
                    <Text color="gray.400" fontSize="sm" fontWeight="normal">
                      {doc.uploaded_by_username}
                    </Text>
                  </Td>
                  <Td py={3} px={4}>
                    <Text color="gray.400" fontSize="sm" fontWeight="normal">
                      {formatDate(doc.uploaded_at)}
                    </Text>
                  </Td>
                  <Td py={3} px={4} isNumeric>
                    <Text color="gray.400" fontSize="sm" fontWeight="normal">
                      {formatFileSize(doc.file_size)}
                    </Text>
                  </Td>
                  <Td 
                    py={3} 
                    px={4} 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HStack 
                      spacing={1} 
                      justify="flex-end"
                      opacity={isHovered ? 1 : 0}
                      transition="opacity 0.15s"
                    >
                      <Tooltip label="View">
                        <IconButton
                          icon={<FiEye />}
                          size="xs"
                          variant="ghost"
                          color="gray.400"
                          onClick={() => onViewDocument(doc.id)}
                          aria-label="View document"
                          _hover={{ bg: 'primary.600', color: 'accent.400' }}
                        />
                      </Tooltip>
                      <Tooltip label="Download">
                        <IconButton
                          icon={<FiDownload />}
                          size="xs"
                          variant="ghost"
                          color="gray.400"
                          onClick={() => handleDownload(doc.id)}
                          aria-label="Download"
                          _hover={{ bg: 'primary.600', color: 'white' }}
                        />
                      </Tooltip>
                      {canDelete(doc) && (
                        <Tooltip label="Delete">
                          <IconButton
                            icon={<FiTrash2 />}
                            size="xs"
                            variant="ghost"
                            color="gray.400"
                            onClick={() => handleDeleteClick(doc.id, doc.filename)}
                            aria-label="Delete document"
                            _hover={{ bg: 'primary.600', color: 'red.400' }}
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>

      {/* Delete Dialog */}
      <AlertDialog isOpen={isOpen} onClose={onClose} isCentered>
        <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <AlertDialogContent bg="primary.800" border="1px" borderColor="red.500" mx={4}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
            <HStack spacing={3}>
              <Box p={2} bg="red.500" rounded="lg">
                <FiTrash2 size={20} color="white" />
              </Box>
              <Text>Delete Document</Text>
            </HStack>
          </AlertDialogHeader>

          <AlertDialogBody color="gray.300">
            <VStack align="start" spacing={3}>
              <Text>
                Are you sure you want to delete <Text as="span" fontWeight="bold" color="white">{deleteName}</Text>?
              </Text>
              <Box 
                p={3} 
                bg="red.900" 
                border="1px" 
                borderColor="red.700" 
                rounded="md"
                w="full"
              >
                <Text fontSize="sm" color="red.200">
                  This action cannot be undone.
                </Text>
              </Box>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button 
              onClick={onClose} 
              variant="ghost" 
              color="gray.400"
              _hover={{ bg: 'primary.700' }}
            >
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDeleteConfirm}
              ml={3}
              leftIcon={<FiTrash2 />}
            >
              Delete Document
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DocumentList;