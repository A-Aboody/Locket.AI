import { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  IconButton,
  Tooltip,
  Button,
  useToast,
  Spinner,
  Center,
  Icon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Badge,
} from '@chakra-ui/react';
import {
  FiFile,
  FiFileText,
  FiTrash2,
  FiPlus,
  FiEye,
  FiDownload,
} from 'react-icons/fi';
import { userGroupsAPI, documentsAPI, apiUtils } from '../../utils/api';
import { formatFileSize, formatDate } from '../../utils/formatters';
import AddDocumentToGroupFromGroup from './AddDocumentToGroupFromGroup';

const GroupDocuments = ({ groupId, groupName, isOwner, currentUserId, onViewDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removeDocId, setRemoveDocId] = useState(null);
  const [removeDocName, setRemoveDocName] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isAddOpen,
    onOpen: onAddOpen,
    onClose: onAddClose,
  } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [groupId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await userGroupsAPI.getGroupDocuments(groupId);
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch group documents:', error);
      toast({
        title: 'Failed to load documents',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    if (ext === 'pdf') return { icon: FiFileText, color: 'red.400' };
    if (ext === 'doc' || ext === 'docx') return { icon: FiFileText, color: 'blue.400' };
    if (ext === 'txt') return { icon: FiFileText, color: 'gray.400' };
    return { icon: FiFile, color: 'accent.400' };
  };

  const canRemoveDocument = (doc) => {
    // Owner can remove any document, users can only remove their own
    return isOwner || doc.uploaded_by_id === currentUserId;
  };

  const handleRemoveClick = (doc) => {
    setRemoveDocId(doc.id);
    setRemoveDocName(doc.filename);
    onOpen();
  };

  const handleRemoveConfirm = async () => {
    try {
      // Remove document from group by changing visibility back to private
      await documentsAPI.updateVisibility(removeDocId, {
        visibility: 'private',
        user_group_id: null,
      });

      toast({
        title: 'Document removed from group',
        description: `${removeDocName} is now private`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      fetchDocuments();
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to remove document',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleViewDocument = (docId) => {
    if (onViewDocument) {
      // Use the callback to open the document viewer/preview
      onViewDocument(docId);
    } else {
      // Fallback to opening in new tab if no callback provided
      window.open(`/document/${docId}`, '_blank');
    }
  };

  const handleDownload = (docId) => {
    const url = documentsAPI.getFileUrl(docId);
    window.open(url, '_blank');
  };

  const handleAddSuccess = () => {
    fetchDocuments();
    onAddClose();
  };

  if (loading) {
    return (
      <Center py={8}>
        <VStack spacing={3}>
          <Spinner size="lg" color="accent.500" thickness="3px" />
          <Text color="gray.400" fontSize="sm">
            Loading documents...
          </Text>
        </VStack>
      </Center>
    );
  }

  return (
    <>
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between">
          <Text color="gray.300" fontSize="sm" fontWeight="medium">
            Documents ({documents.length})
          </Text>
          <Button
            leftIcon={<FiPlus />}
            size="xs"
            colorScheme="accent"
            onClick={onAddOpen}
          >
            Add Document
          </Button>
        </HStack>

        {documents.length === 0 ? (
          <Box
            p={8}
            bg="primary.700"
            rounded="lg"
            border="1px dashed"
            borderColor="primary.600"
            textAlign="center"
          >
            <VStack spacing={2}>
              <Icon as={FiFile} boxSize={8} color="gray.500" />
              <Text color="gray.400" fontSize="sm">
                No documents in this group yet
              </Text>
              <Button
                size="sm"
                variant="ghost"
                colorScheme="accent"
                leftIcon={<FiPlus />}
                onClick={onAddOpen}
              >
                Add your first document
              </Button>
            </VStack>
          </Box>
        ) : (
          <VStack spacing={2} align="stretch">
            {documents.map((doc) => {
              const fileIconData = getFileIcon(doc.filename);

              return (
                <Box
                  key={doc.id}
                  p={3}
                  bg="primary.700"
                  rounded="lg"
                  border="1px"
                  borderColor="primary.600"
                  _hover={{ bg: 'primary.600', borderColor: 'accent.500' }}
                  transition="all 0.2s"
                >
                  <HStack justify="space-between">
                    <HStack spacing={3} flex={1} minW={0}>
                      <Icon
                        as={fileIconData.icon}
                        boxSize={5}
                        color={fileIconData.color}
                      />
                      <VStack align="start" spacing={0} flex={1} minW={0}>
                        <Text
                          color="white"
                          fontSize="sm"
                          fontWeight="medium"
                          noOfLines={1}
                        >
                          {doc.filename}
                        </Text>
                        <HStack spacing={2} fontSize="xs" color="gray.500">
                          <Text>{formatFileSize(doc.file_size)}</Text>
                          <Text>•</Text>
                          <Text noOfLines={1}>
                            by {doc.uploaded_by_username}
                          </Text>
                        </HStack>
                      </VStack>
                    </HStack>

                    <HStack spacing={1}>
                      <Tooltip label="View">
                        <IconButton
                          icon={<FiEye />}
                          size="xs"
                          variant="ghost"
                          color="gray.400"
                          onClick={() => handleViewDocument(doc.id)}
                          aria-label="View document"
                          _hover={{ color: 'accent.400', bg: 'primary.600' }}
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
                          _hover={{ color: 'white', bg: 'primary.600' }}
                        />
                      </Tooltip>
                      {canRemoveDocument(doc) && (
                        <Tooltip
                          label={
                            isOwner
                              ? 'Remove from group'
                              : 'Remove your document'
                          }
                        >
                          <IconButton
                            icon={<FiTrash2 />}
                            size="xs"
                            variant="ghost"
                            color="gray.400"
                            onClick={() => handleRemoveClick(doc)}
                            aria-label="Remove document"
                            _hover={{ color: 'red.400', bg: 'primary.600' }}
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </HStack>
                </Box>
              );
            })}
          </VStack>
        )}
      </VStack>

      {/* Remove Confirmation Dialog */}
      <AlertDialog isOpen={isOpen} onClose={onClose} isCentered>
        <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <AlertDialogContent
          bg="primary.800"
          border="1px"
          borderColor="yellow.500"
          mx={4}
        >
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
            <HStack spacing={3}>
              <Box p={2} bg="yellow.500" rounded="lg">
                <FiTrash2 size={20} color="white" />
              </Box>
              <Text>Remove Document from Group</Text>
            </HStack>
          </AlertDialogHeader>

          <AlertDialogBody color="gray.300">
            <VStack align="start" spacing={3}>
              <Text>
                Are you sure you want to remove{' '}
                <Text as="span" fontWeight="bold" color="white">
                  {removeDocName}
                </Text>{' '}
                from this group?
              </Text>
              <Box
                p={3}
                bg="yellow.900"
                border="1px"
                borderColor="yellow.700"
                rounded="md"
                w="full"
              >
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color="yellow.200" fontWeight="medium">
                    This will:
                  </Text>
                  <Text fontSize="sm" color="yellow.300">
                    • Change the document visibility to "Private"
                  </Text>
                  <Text fontSize="sm" color="yellow.300">
                    • Remove access for all group members
                  </Text>
                  <Text fontSize="sm" color="yellow.300">
                    • Keep the document in your library
                  </Text>
                </VStack>
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
              colorScheme="yellow"
              onClick={handleRemoveConfirm}
              ml={3}
              leftIcon={<FiTrash2 />}
            >
              Remove from Group
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Document Modal */}
      <AddDocumentToGroupFromGroup
        isOpen={isAddOpen}
        onClose={onAddClose}
        groupId={groupId}
        groupName={groupName}
        onSuccess={handleAddSuccess}
      />
    </>
  );
};

export default GroupDocuments;
