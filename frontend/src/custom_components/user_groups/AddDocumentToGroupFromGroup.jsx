import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Icon,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Radio,
  RadioGroup,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { FiFile, FiFileText, FiAlertCircle, FiUsers } from 'react-icons/fi';
import { documentsAPI, apiUtils } from '../../utils/api';
import { formatFileSize, formatDate } from '../../utils/formatters';

const AddDocumentToGroupFromGroup = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  onSuccess,
}) => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const toast = useToast();
  const currentUser = apiUtils.getCurrentUser();

  useEffect(() => {
    if (isOpen) {
      fetchUserDocuments();
      setShowConfirm(false);
      setSelectedDocId(null);
    }
  }, [isOpen]);

  const fetchUserDocuments = async () => {
    setLoadingDocs(true);
    try {
      // Fetch user's documents (not in this group)
      const response = await documentsAPI.list({ user_only: true });
      const allDocs = response.data || [];

      // Filter out documents that are already in this group
      const availableDocs = allDocs.filter(
        (doc) => doc.user_group_id !== groupId
      );

      setDocuments(availableDocs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast({
        title: 'Failed to load documents',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingDocs(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    if (ext === 'pdf') return { icon: FiFileText, color: 'red.400' };
    if (ext === 'doc' || ext === 'docx')
      return { icon: FiFileText, color: 'blue.400' };
    if (ext === 'txt') return { icon: FiFileText, color: 'gray.400' };
    return { icon: FiFile, color: 'accent.400' };
  };

  const handleAddToGroup = () => {
    if (!selectedDocId) {
      toast({
        title: 'No document selected',
        description: 'Please select a document',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmAdd = async () => {
    if (!selectedDocId) return;

    setIsLoading(true);
    try {
      const selectedDoc = documents.find(
        (d) => d.id === parseInt(selectedDocId)
      );

      await documentsAPI.updateVisibility(parseInt(selectedDocId), {
        visibility: 'group',
        user_group_id: groupId,
      });

      toast({
        title: 'Document added to group',
        description: `${selectedDoc.filename} is now shared with ${groupName}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      console.error('Failed to add document to group:', error);
      toast({
        title: 'Failed to add document',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDoc = documents.find((d) => d.id === parseInt(selectedDocId));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <ModalContent
        bg="primary.800"
        border="1px"
        borderColor="primary.600"
        mx={4}
      >
        <ModalHeader color="white">
          <HStack spacing={3}>
            <Box p={2} bg="accent.500" rounded="lg">
              <Icon as={FiUsers} boxSize={5} />
            </Box>
            <VStack align="start" spacing={0}>
              <Text>Add Document to Group</Text>
              <Text fontSize="sm" fontWeight="normal" color="gray.400">
                {groupName}
              </Text>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="gray.400" />

        <ModalBody>
          {loadingDocs ? (
            <Center py={8}>
              <VStack spacing={3}>
                <Spinner size="lg" color="accent.500" thickness="3px" />
                <Text color="gray.400">Loading your documents...</Text>
              </VStack>
            </Center>
          ) : showConfirm ? (
            <VStack spacing={4} align="stretch">
              <Alert
                status="warning"
                variant="left-accent"
                rounded="lg"
                bg="yellow.900"
                borderColor="yellow.500"
              >
                <AlertIcon />
                <Box>
                  <AlertTitle color="yellow.200">Confirm Action</AlertTitle>
                  <AlertDescription color="yellow.300">
                    Are you sure you want to add{' '}
                    <Text as="span" fontWeight="bold">
                      {selectedDoc?.filename}
                    </Text>{' '}
                    to this group?
                  </AlertDescription>
                </Box>
              </Alert>

              <Box
                bg="primary.700"
                p={4}
                rounded="lg"
                border="1px"
                borderColor="primary.600"
              >
                <VStack align="start" spacing={2}>
                  <HStack spacing={2}>
                    <Icon as={FiAlertCircle} color="accent.400" boxSize={4} />
                    <Text color="white" fontWeight="medium" fontSize="sm">
                      What will happen:
                    </Text>
                  </HStack>
                  <VStack align="start" spacing={1} pl={6}>
                    <Text color="gray.300" fontSize="sm">
                      • Document visibility will change to "Group"
                    </Text>
                    <Text color="gray.300" fontSize="sm">
                      • All members of {groupName} can view this document
                    </Text>
                    <Text color="gray.300" fontSize="sm">
                      • Other users outside the group won't be able to access it
                    </Text>
                  </VStack>
                </VStack>
              </Box>
            </VStack>
          ) : documents.length === 0 ? (
            <Box
              p={8}
              bg="primary.700"
              rounded="lg"
              border="1px dashed"
              borderColor="primary.600"
              textAlign="center"
            >
              <VStack spacing={3}>
                <Icon as={FiFile} boxSize={12} color="gray.500" />
                <Text color="white" fontWeight="medium">
                  No documents available
                </Text>
                <Text color="gray.400" fontSize="sm">
                  All your documents are either already in this group or you
                  haven't uploaded any yet.
                </Text>
              </VStack>
            </Box>
          ) : (
            <VStack spacing={4} align="stretch">
              <Text color="gray.300" fontSize="sm">
                Select a document to add to this group
              </Text>

              <RadioGroup value={selectedDocId} onChange={setSelectedDocId}>
                <VStack spacing={2} align="stretch" maxH="300px" overflowY="auto">
                  {documents.map((doc) => {
                    const fileIconData = getFileIcon(doc.filename);

                    return (
                      <Box
                        key={doc.id}
                        p={3}
                        bg="primary.700"
                        rounded="lg"
                        border="2px"
                        borderColor={
                          selectedDocId === doc.id.toString()
                            ? 'accent.500'
                            : 'primary.600'
                        }
                        cursor="pointer"
                        onClick={() => setSelectedDocId(doc.id.toString())}
                        transition="all 0.2s"
                        _hover={{
                          borderColor: 'accent.500',
                          bg: 'primary.600',
                        }}
                      >
                        <HStack spacing={3}>
                          <Radio value={doc.id.toString()} colorScheme="purple">
                            <HStack spacing={3} ml={2}>
                              <Icon
                                as={fileIconData.icon}
                                boxSize={4}
                                color={fileIconData.color}
                              />
                              <VStack align="start" spacing={0}>
                                <Text
                                  color="white"
                                  fontWeight="medium"
                                  fontSize="sm"
                                  noOfLines={1}
                                >
                                  {doc.filename}
                                </Text>
                                <HStack
                                  spacing={2}
                                  fontSize="xs"
                                  color="gray.500"
                                >
                                  <Text>{formatFileSize(doc.file_size)}</Text>
                                  <Text>•</Text>
                                  <Text>{formatDate(doc.uploaded_at)}</Text>
                                </HStack>
                              </VStack>
                            </HStack>
                          </Radio>
                        </HStack>
                      </Box>
                    );
                  })}
                </VStack>
              </RadioGroup>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {showConfirm ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setShowConfirm(false)}
                color="gray.400"
                _hover={{ bg: 'primary.700' }}
              >
                Back
              </Button>
              <Button
                colorScheme="purple"
                onClick={handleConfirmAdd}
                isLoading={isLoading}
                ml={3}
                leftIcon={<FiUsers />}
              >
                Confirm
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={onClose}
                color="gray.400"
                _hover={{ bg: 'primary.700' }}
              >
                Cancel
              </Button>
              {documents.length > 0 && (
                <Button
                  colorScheme="purple"
                  onClick={handleAddToGroup}
                  isDisabled={!selectedDocId}
                  ml={3}
                  leftIcon={<FiUsers />}
                >
                  Add to Group
                </Button>
              )}
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddDocumentToGroupFromGroup;
