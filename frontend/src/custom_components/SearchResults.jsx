// SearchResults.jsx
import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
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
  Card,
  CardBody,
  Tooltip,
  Center,
  Avatar,
  Divider,
} from '@chakra-ui/react';
import { 
  FiFile, 
  FiEye, 
  FiZap, 
  FiTrash2, 
  FiDownload,
  FiFileText,
  FiUser,
  FiCalendar,
  FiUsers,
  FiEyeOff,
  FiGlobe,
  FiSearch,
} from 'react-icons/fi';
import { formatFileSize, formatDate, getFileTypeColor } from '../utils/formatters';
import { documentsAPI } from '../utils/api';

const SearchResults = ({ 
  results, 
  query, 
  searchTime, 
  isLoading, 
  onViewDocument, 
  onSearchUpdate 
}) => {
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
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

  const getVisibilityInfo = (doc) => {
    if (doc.visibility === 'private') {
      return { icon: FiEyeOff, label: 'Private', color: 'gray' };
    }
    if (doc.visibility === 'public') {
      return { icon: FiGlobe, label: 'Public', color: 'green' };
    }
    if (doc.visibility === 'group') {
      return { icon: FiUsers, label: doc.user_group_name || 'Group', color: 'accent' };
    }
    return { icon: FiEyeOff, label: 'Private', color: 'gray' };
  };

  const handleDownload = (documentId) => {
    const url = documentsAPI.getFileUrl(documentId);
    window.open(url, '_blank');
  };

  const getRelevanceColor = (score) => {
    if (score >= 0.7) return 'green';
    if (score >= 0.4) return 'yellow';
    return 'orange';
  };

  if (isLoading) {
    return (
      <Center py={20}>
        <VStack spacing={4}>
          <Spinner size="xl" color="accent.500" thickness="3px" />
          <Text color="gray.400">Searching documents...</Text>
        </VStack>
      </Center>
    );
  }

  if (!results || results.length === 0) {
    if (!query) {
      return null;
    }

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
            <FiSearch size={48} color="#4A5568" />
          </Box>
          <Text fontSize="lg" color="white" fontWeight="medium">
            No results found
          </Text>
          <Text color="gray.400" fontSize="sm" textAlign="center" maxW="300px">
            No documents match "{query}". Try different keywords or check your spelling.
          </Text>
        </VStack>
      </Center>
    );
  }

  return (
    <>
      <Box bg="primary.900" rounded="xl" border="1px" borderColor="primary.600" overflow="hidden">
        {/* Header */}
        <Box 
          bg="primary.800" 
          p={5} 
          borderBottom="1px" 
          borderColor="primary.600"
        >
          <HStack justify="space-between" flexWrap="wrap" spacing={4}>
            <HStack spacing={3}>
              <Box 
                p={2} 
                bg="accent.500" 
                rounded="lg"
              >
                <FiZap size={20} color="white" />
              </Box>
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold" color="white" fontSize="lg">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </Text>
                <Text color="gray.400" fontSize="sm">
                  for "{query}"
                </Text>
              </VStack>
            </HStack>
            <Badge colorScheme="accent" fontSize="sm" px={3} py={1}>
              {searchTime}ms
            </Badge>
          </HStack>
        </Box>

        {/* Results */}
        <VStack spacing={0} align="stretch" divider={<Divider borderColor="primary.600" />}>
          {results.map((result) => {
            const fileIconData = getFileIcon(result.filename);
            const visibilityInfo = getVisibilityInfo(result);
            
            return (
              <Card
                key={result.id}
                bg="transparent"
                border="none"
                rounded="none"
                _hover={{ bg: 'primary.800' }}
                transition="all 0.2s"
              >
                <CardBody p={6}>
                  <VStack align="stretch" spacing={4}>
                    {/* Header */}
                    <HStack justify="space-between" align="start">
                      <HStack spacing={4} flex={1}>
                        <Box 
                          p={3} 
                          bg="primary.700" 
                          rounded="lg"
                          border="1px"
                          borderColor="primary.600"
                        >
                          <Icon 
                            as={fileIconData.icon} 
                            boxSize={6} 
                            color={fileIconData.color}
                          />
                        </Box>
                        
                        <VStack align="start" spacing={2} flex={1}>
                          <Text 
                            fontWeight="semibold" 
                            fontSize="lg" 
                            color="white"
                            cursor="pointer"
                            _hover={{ color: 'accent.400' }}
                            onClick={() => onViewDocument(result.id)}
                          >
                            {result.filename}
                          </Text>
                          
                          {/* Badges */}
                          <HStack spacing={2} flexWrap="wrap">
                            <Badge
                              colorScheme={getFileTypeColor(result.filename)}
                              fontSize="xs"
                              px={2}
                              py={0.5}
                            >
                              {getFileExtension(result.filename)}
                            </Badge>
                            <Badge
                              colorScheme={visibilityInfo.color}
                              fontSize="xs"
                              px={2}
                              py={0.5}
                            >
                              <HStack spacing={1}>
                                <Icon as={visibilityInfo.icon} boxSize={2.5} />
                                <Text>{visibilityInfo.label}</Text>
                              </HStack>
                            </Badge>
                          </HStack>
                        </VStack>
                      </HStack>

                      {/* Actions */}
                      <HStack spacing={1}>
                        <Tooltip label="View document">
                          <IconButton
                            icon={<FiEye />}
                            size="sm"
                            variant="ghost"
                            color="accent.400"
                            onClick={() => onViewDocument(result.id)}
                            aria-label="View document"
                            _hover={{ color: 'accent.300', bg: 'primary.700' }}
                          />
                        </Tooltip>
                        <Tooltip label="Download">
                          <IconButton
                            icon={<FiDownload />}
                            size="sm"
                            variant="ghost"
                            color="gray.400"
                            onClick={() => handleDownload(result.id)}
                            aria-label="Download document"
                            _hover={{ color: 'white', bg: 'primary.700' }}
                          />
                        </Tooltip>
                        {canDelete(result) && (
                          <Tooltip label="Delete">
                            <IconButton
                              icon={<FiTrash2 />}
                              size="sm"
                              variant="ghost"
                              color="gray.400"
                              onClick={() => handleDeleteClick(result.id, result.filename)}
                              aria-label="Delete document"
                              _hover={{ color: 'red.400', bg: 'primary.700' }}
                            />
                          </Tooltip>
                        )}
                      </HStack>
                    </HStack>

                    {/* Metadata */}
                    <HStack spacing={4} fontSize="xs" color="gray.400" flexWrap="wrap">
                      <HStack spacing={1}>
                        <Icon as={FiUser} boxSize={3} />
                        <Text>{result.uploaded_by_username}</Text>
                      </HStack>
                      <HStack spacing={1}>
                        <Icon as={FiCalendar} boxSize={3} />
                        <Text>{formatDate(result.uploaded_at)}</Text>
                      </HStack>
                      <HStack spacing={1}>
                        <Icon as={FiFile} boxSize={3} />
                        <Text>{formatFileSize(result.file_size)}</Text>
                      </HStack>
                      <Text>•</Text>
                      <Text>{result.page_count} {result.page_count === 1 ? 'page' : 'pages'}</Text>
                    </HStack>

                    {/* Snippet */}
                    {result.snippet && (
                      <Box
                        bg="primary.800"
                        p={4}
                        rounded="md"
                        fontSize="sm"
                        color="gray.300"
                        borderLeft="3px solid"
                        borderColor="accent.500"
                        lineHeight="tall"
                      >
                        <Text>{result.snippet}</Text>
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </VStack>
      </Box>

      {/* Delete Confirmation Dialog */}
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

export default SearchResults;