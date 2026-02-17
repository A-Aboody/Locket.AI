import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  HStack,
  VStack,
  useToast,
  Flex,
  Icon,
  IconButton,
  Button,
  Tooltip,
  Center,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiTrash2,
  FiRotateCcw,
  FiFileText,
  FiFile,
  FiAlertTriangle,
} from 'react-icons/fi';
import AppHeader from '../custom_components/AppHeader';
import NavTabs from '../custom_components/NavTabs';
import FloatingMenu from '../custom_components/FloatingMenu';
import PageTransition from '../custom_components/PageTransition';
import ContextMenu from '../custom_components/ContextMenu';
import { trashAPI } from '../utils/api';
import { formatFileSize, formatDate } from '../utils/formatters';

const TrashPage = () => {
  const [user, setUser] = useState(null);
  const [trashedDocs, setTrashedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, document: null });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchTrashedDocs();
    }
  }, [user]);

  const fetchTrashedDocs = async () => {
    setLoading(true);
    try {
      const response = await trashAPI.list();
      setTrashedDocs(response.data);
    } catch (error) {
      toast({
        title: 'Failed to load trash',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (docId, docName) => {
    try {
      await trashAPI.restore(docId);
      toast({
        title: 'Document restored',
        description: `${docName} has been restored`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchTrashedDocs();
    } catch (error) {
      toast({
        title: 'Restore failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteForeverClick = (docId, docName) => {
    setDeleteTarget({ id: docId, name: docName, type: 'single' });
    onOpen();
  };

  const handleEmptyTrashClick = () => {
    setDeleteTarget({ id: null, name: null, type: 'all' });
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    try {
      if (deleteTarget.type === 'all') {
        await trashAPI.empty();
        toast({
          title: 'Trash emptied',
          description: 'All documents have been permanently deleted',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        await trashAPI.deletePermanently(deleteTarget.id);
        toast({
          title: 'Permanently deleted',
          description: `${deleteTarget.name} has been permanently deleted`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      fetchTrashedDocs();
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
      setDeleteTarget(null);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    if (ext === 'pdf') return { icon: FiFileText, color: 'red.400' };
    if (ext === 'doc' || ext === 'docx') return { icon: FiFileText, color: 'blue.400' };
    if (ext === 'txt') return { icon: FiFileText, color: 'gray.400' };
    return { icon: FiFile, color: 'accent.400' };
  };

  const handleContextMenu = (e, doc) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: false, position: null, document: null });
    requestAnimationFrame(() => {
      setContextMenu({
        visible: true,
        position: { x: e.clientX, y: e.clientY },
        document: doc,
      });
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, position: null, document: null });
  };

  if (!user) return null;

  return (
    <Box minH="100vh" bg="background.primary">
      <AppHeader user={user} />

      <Flex h="calc(100vh - 73px)">
        <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
          <NavTabs />

          <Box flex={1} overflowY="auto" p={6}>
            <PageTransition>
              <Box maxW="100%">
                <HStack justify="space-between" mb={4}>
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    Trash
                  </Text>
                  {trashedDocs.length > 0 && (
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      leftIcon={<FiTrash2 />}
                      onClick={handleEmptyTrashClick}
                    >
                      Empty Trash
                    </Button>
                  )}
                </HStack>

                {trashedDocs.length > 0 && (
                  <Text color="gray.500" fontSize="sm" mb={4}>
                    Documents in trash will be automatically deleted after 30 days.
                  </Text>
                )}

                {loading ? (
                  <Center py={20}>
                    <VStack spacing={4}>
                      <Spinner size="xl" color="accent.500" thickness="3px" />
                      <Text color="gray.400">Loading trash...</Text>
                    </VStack>
                  </Center>
                ) : trashedDocs.length === 0 ? (
                  <Center py={20}>
                    <VStack spacing={4}>
                      <Box
                        p={6}
                        bg="primary.800"
                        rounded="full"
                        border="2px dashed"
                        borderColor="primary.600"
                      >
                        <FiTrash2 size={48} color="#3d4148" />
                      </Box>
                      <Text fontSize="lg" color="white" fontWeight="medium">
                        Trash is empty
                      </Text>
                      <Text color="gray.400" fontSize="sm" textAlign="center" maxW="300px">
                        Deleted documents will appear here
                      </Text>
                    </VStack>
                  </Center>
                ) : (
                  <Box overflow="hidden">
                    <Table variant="unstyled" size="sm">
                      <Thead>
                        <Tr borderBottom="1px" borderColor="whiteAlpha.200">
                          <Th color="gray.500" fontSize="xs" textTransform="none" fontWeight="normal" py={3} px={3}>
                            Name
                          </Th>
                          <Th color="gray.500" fontSize="xs" textTransform="none" fontWeight="normal" py={3} px={3}>
                            Date Deleted
                          </Th>
                          <Th color="gray.500" fontSize="xs" textTransform="none" fontWeight="normal" py={3} px={3}>
                            Original Location
                          </Th>
                          <Th color="gray.500" fontSize="xs" textTransform="none" fontWeight="normal" py={3} px={3} isNumeric>
                            Size
                          </Th>
                          <Th color="gray.500" fontSize="xs" textTransform="none" fontWeight="normal" py={3} px={3} w="140px">
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {trashedDocs.map((doc) => {
                          const fileIconData = getFileIcon(doc.filename);
                          return (
                            <Tr
                              key={doc.id}
                              _hover={{ bg: 'whiteAlpha.50' }}
                              transition="background 0.15s"
                              borderBottom="1px"
                              borderColor="whiteAlpha.100"
                              _last={{ borderBottom: 'none' }}
                              onContextMenu={(e) => handleContextMenu(e, doc)}
                              cursor="default"
                            >
                              <Td py={3} px={3}>
                                <HStack spacing={3}>
                                  <Icon as={fileIconData.icon} boxSize={4} color={fileIconData.color} />
                                  <Text color="white" fontSize="sm" noOfLines={1} maxW="400px">
                                    {doc.filename}
                                  </Text>
                                </HStack>
                              </Td>
                              <Td py={3} px={3}>
                                <Text color="gray.500" fontSize="sm">
                                  {formatDate(doc.trashed_at)}
                                </Text>
                              </Td>
                              <Td py={3} px={3}>
                                <Text color="gray.500" fontSize="sm">
                                  {doc.folder_name || 'Root'}
                                </Text>
                              </Td>
                              <Td py={3} px={3} isNumeric>
                                <Text color="gray.500" fontSize="sm">
                                  {formatFileSize(doc.file_size)}
                                </Text>
                              </Td>
                              <Td py={3} px={3}>
                                <HStack spacing={1} justify="flex-end">
                                  <Tooltip label="Restore">
                                    <IconButton
                                      icon={<FiRotateCcw />}
                                      size="xs"
                                      variant="ghost"
                                      color="gray.500"
                                      onClick={() => handleRestore(doc.id, doc.filename)}
                                      aria-label="Restore document"
                                      _hover={{ color: 'accent.400', bg: 'whiteAlpha.100' }}
                                    />
                                  </Tooltip>
                                  <Tooltip label="Delete forever">
                                    <IconButton
                                      icon={<FiTrash2 />}
                                      size="xs"
                                      variant="ghost"
                                      color="gray.500"
                                      onClick={() => handleDeleteForeverClick(doc.id, doc.filename)}
                                      aria-label="Delete forever"
                                      _hover={{ color: 'red.400', bg: 'whiteAlpha.100' }}
                                    />
                                  </Tooltip>
                                </HStack>
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                )}
              </Box>
            </PageTransition>
          </Box>
        </Box>
      </Flex>

      {/* Trash Context Menu */}
      <ContextMenu
        position={contextMenu.position}
        document={contextMenu.document}
        isVisible={contextMenu.visible}
        onClose={closeContextMenu}
        isTrash={true}
        onRestore={(docId, docName) => handleRestore(docId, docName)}
        onDeleteForever={(docId, docName) => handleDeleteForeverClick(docId, docName)}
      />

      <FloatingMenu
        onProfile={() => {}}
        onSettings={() => navigate('/settings')}
        onLogout={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/auth');
        }}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose} isCentered>
        <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <AlertDialogContent bg="primary.800" border="1px" borderColor="red.500" mx={4}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
            <HStack spacing={3}>
              <Box p={2} bg="red.500" rounded="lg">
                <FiAlertTriangle size={20} color="white" />
              </Box>
              <Text>
                {deleteTarget?.type === 'all' ? 'Empty Trash' : 'Delete Forever'}
              </Text>
            </HStack>
          </AlertDialogHeader>

          <AlertDialogBody color="gray.300">
            <VStack align="start" spacing={3}>
              <Text>
                {deleteTarget?.type === 'all' ? (
                  <>Are you sure you want to permanently delete <Text as="span" fontWeight="bold" color="white">all {trashedDocs.length} document(s)</Text> in trash?</>
                ) : (
                  <>Are you sure you want to permanently delete <Text as="span" fontWeight="bold" color="white">{deleteTarget?.name}</Text>?</>
                )}
              </Text>
              <Box p={3} bg="red.900" border="1px" borderColor="red.700" rounded="md" w="full">
                <Text fontSize="sm" color="red.200">
                  This action cannot be undone. The file will be permanently removed.
                </Text>
              </Box>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button
              ref={cancelRef}
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
              {deleteTarget?.type === 'all' ? 'Empty Trash' : 'Delete Forever'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
};

export default TrashPage;
