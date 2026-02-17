import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
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
  Tooltip,
  Center,
} from '@chakra-ui/react';
import {
  FiFile,
  FiEye,
  FiTrash2,
  FiDownload,
  FiFileText,
  FiUsers,
  FiEyeOff,
  FiGlobe,
  FiSearch,
  FiFolder,
  FiChevronRight,
} from 'react-icons/fi';
import { formatFileSize, formatDate } from '../utils/formatters';
import { documentsAPI } from '../utils/api';

const SearchResults = ({ 
  results, 
  query, 
  searchTime, 
  isLoading, 
  onViewDocument, 
  onSearchUpdate,
  folderResults = [],
  onFolderNavigate,
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
      return { icon: FiEyeOff, label: 'Private', color: 'gray.500' };
    }
    if (doc.visibility === 'public') {
      return { icon: FiGlobe, label: 'Public', color: 'green.400' };
    }
    if (doc.visibility === 'group') {
      return { icon: FiUsers, label: doc.user_group_name || 'Group', color: 'accent.400' };
    }
    return { icon: FiEyeOff, label: 'Private', color: 'gray.500' };
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

  const hasResults = (results && results.length > 0) || (folderResults && folderResults.length > 0);

  if (!hasResults) {
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
            <FiSearch size={48} color="#3d4148" />
          </Box>
          <Text fontSize="lg" color="white" fontWeight="medium">
            No results found
          </Text>
          <Text color="gray.400" fontSize="sm" textAlign="center" maxW="300px">
            No documents or folders match "{query}". Try different keywords or check your spelling.
          </Text>
        </VStack>
      </Center>
    );
  }

  const totalResults = (results?.length || 0) + (folderResults?.length || 0);

  return (
    <>
      <VStack spacing={0} align="stretch">
        {/* Header */}
        <Box pb={3} borderBottom="2px" borderColor="whiteAlpha.200">
          <HStack justify="space-between" align="baseline">
            <Text color="gray.400" fontSize="sm" fontWeight="normal">
              {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
              {folderResults.length > 0 && ` (${folderResults.length} folder${folderResults.length !== 1 ? 's' : ''})`}
            </Text>
            <Text color="gray.500" fontSize="xs">
              {searchTime}ms
            </Text>
          </HStack>
        </Box>

        {/* Folder Results */}
        {folderResults.length > 0 && (
          <VStack spacing={0} align="stretch" pt={1}>
            <Text color="gray.500" fontSize="xs" fontWeight="medium" px={1} py={2} textTransform="uppercase" letterSpacing="wider">
              Folders
            </Text>
            {folderResults.map((folder) => (
              <Box
                key={`folder-${folder.id}`}
                py={3}
                px={3}
                borderBottom="1px"
                borderColor="whiteAlpha.100"
                _hover={{ bg: 'whiteAlpha.50' }}
                transition="background 0.15s"
                cursor="pointer"
                onClick={() => onFolderNavigate && onFolderNavigate(folder.id)}
              >
                <HStack spacing={3}>
                  <Icon as={FiFolder} boxSize={5} color="accent.400" />
                  <VStack align="start" spacing={0} flex={1}>
                    <Text color="white" fontSize="sm" fontWeight="medium">
                      {folder.name}
                    </Text>
                    <Text color="gray.500" fontSize="xs">
                      {folder.document_count || 0} file{folder.document_count !== 1 ? 's' : ''}
                      {folder.subfolder_count > 0 && ` · ${folder.subfolder_count} folder${folder.subfolder_count !== 1 ? 's' : ''}`}
                    </Text>
                  </VStack>
                  <Icon as={FiChevronRight} boxSize={4} color="gray.600" />
                </HStack>
              </Box>
            ))}
          </VStack>
        )}

        {/* Document Results */}
        <VStack spacing={0} align="stretch" pt={1}>
          {folderResults.length > 0 && results && results.length > 0 && (
            <Text color="gray.500" fontSize="xs" fontWeight="medium" px={1} py={2} textTransform="uppercase" letterSpacing="wider">
              Documents
            </Text>
          )}
          {(results || []).map((result) => {
            const fileIconData = getFileIcon(result.filename);
            const visibilityInfo = getVisibilityInfo(result);

            return (
              <Box
                key={result.id}
                py={5}
                borderBottom="1px"
                borderColor="whiteAlpha.100"
                _last={{ borderBottom: 'none' }}
                _hover={{ bg: 'whiteAlpha.50' }}
                transition="background 0.15s"
              >
                <VStack align="stretch" spacing={3}>
                  {/* Header */}
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={2} flex={1}>
                      <HStack spacing={2}>
                        <Icon
                          as={fileIconData.icon}
                          boxSize={4}
                          color={fileIconData.color}
                        />
                        <Text
                          fontWeight="medium"
                          fontSize="md"
                          color="white"
                          cursor="pointer"
                          _hover={{ color: 'gray.300' }}
                          onClick={() => onViewDocument(result.id)}
                        >
                          {result.filename}
                        </Text>
                      </HStack>

                      {/* Metadata - single line */}
                      <HStack spacing={3} fontSize="xs" color="gray.500" flexWrap="wrap" pl={6}>
                        <Text>{getFileExtension(result.filename)}</Text>
                        <Text>•</Text>
                        <HStack spacing={1}>
                          <Icon as={visibilityInfo.icon} boxSize={3} color={visibilityInfo.color} />
                          <Text>{visibilityInfo.label}</Text>
                        </HStack>
                        <Text>•</Text>
                        <Text>{result.uploaded_by_username}</Text>
                        <Text>•</Text>
                        <Text>{formatDate(result.uploaded_at)}</Text>
                        <Text>•</Text>
                        <Text>{formatFileSize(result.file_size)}</Text>
                        <Text>•</Text>
                        <Text>{result.page_count} {result.page_count === 1 ? 'page' : 'pages'}</Text>
                      </HStack>
                    </VStack>

                    {/* Actions */}
                    <HStack spacing={0}>
                      <Tooltip label="View">
                        <IconButton
                          icon={<FiEye />}
                          size="sm"
                          variant="ghost"
                          color="gray.500"
                          onClick={() => onViewDocument(result.id)}
                          aria-label="View document"
                          _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                        />
                      </Tooltip>
                      <Tooltip label="Download">
                        <IconButton
                          icon={<FiDownload />}
                          size="sm"
                          variant="ghost"
                          color="gray.500"
                          onClick={() => handleDownload(result.id)}
                          aria-label="Download document"
                          _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                        />
                      </Tooltip>
                      {canDelete(result) && (
                        <Tooltip label="Delete">
                          <IconButton
                            icon={<FiTrash2 />}
                            size="sm"
                            variant="ghost"
                            color="gray.500"
                            onClick={() => handleDeleteClick(result.id, result.filename)}
                            aria-label="Delete document"
                            _hover={{ color: 'red.400', bg: 'whiteAlpha.100' }}
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </HStack>

                  {/* Snippet */}
                  {result.snippet && (
                    <Box
                      pl={0}
                      fontSize="sm"
                      color="gray.400"
                      lineHeight="1.6"
                    >
                      <Text>{result.snippet}</Text>
                    </Box>
                  )}
                </VStack>
              </Box>
            );
          })}
        </VStack>
      </VStack>

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