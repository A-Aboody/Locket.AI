import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  HStack,
  VStack,
  Text,
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
  Tooltip,
  Center,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
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
  FiUserPlus,
  FiPackage,
  FiFolder,
  FiChevronRight,
} from 'react-icons/fi';
import { documentsAPI, foldersAPI } from '../utils/api';
import { formatFileSize, formatDate } from '../utils/formatters';
import AddDocumentToGroupModal from './user_groups/AddDocumentToGroupModal';
import ContextMenu from './ContextMenu';
import { FiEdit2 as FiEdit2Icon } from 'react-icons/fi';

const DocumentList = ({
  documents = [],
  onViewDocument,
  onViewFullScreen,
  onDelete,
  onRename,
  onCopy,
  onMoveToFolder,
  groups = [],
  folders = [],
  emptyMessage = 'No documents found',
  loading = false,
  viewMode = 'card',
  inlineFolders = [],
  onFolderNavigate,
  onFolderRefresh,
}) => {
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [addToGroupDocument, setAddToGroupDocument] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, document: null });
  const [folderContextMenu, setFolderContextMenu] = useState({ visible: false, position: null, folder: null });
  const [folderMenuPos, setFolderMenuPos] = useState({ x: 0, y: 0 });
  const folderMenuRef = useRef(null);
  const folderDeleteCancelRef = useRef();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Folder rename modal state
  const [renameFolderData, setRenameFolderData] = useState(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const { isOpen: isFolderRenameOpen, onOpen: onFolderRenameOpen, onClose: onFolderRenameClose } = useDisclosure();

  // Folder delete dialog state
  const [deleteFolderId, setDeleteFolderId] = useState(null);
  const [deleteFolderName, setDeleteFolderName] = useState('');
  const { isOpen: isFolderDeleteOpen, onOpen: onFolderDeleteOpen, onClose: onFolderDeleteClose } = useDisclosure();
  const {
    isOpen: isAddToGroupOpen,
    onOpen: onAddToGroupOpen,
    onClose: onAddToGroupClose,
  } = useDisclosure();
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
        title: 'Moved to trash',
        description: `${deleteName} has been moved to trash`,
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

  const canAddToGroup = (doc) => {
    const isOwner = doc.uploaded_by_username === currentUser.username;
    const isAdmin = currentUser.role === 'admin';
    const isPublic = doc.visibility === 'public';
    return isOwner || (isAdmin && isPublic);
  };

  const handleAddToGroupClick = (doc) => {
    setAddToGroupDocument(doc);
    onAddToGroupOpen();
  };

  const handleAddToGroupSuccess = () => {
    if (onDelete) {
      onDelete(); // Refresh the document list
    }
    onAddToGroupClose();
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
    if (doc.visibility === 'organization') {
      return {
        icon: FiPackage,
        text: currentUser.organization_name || 'Organization',
        color: 'blue.400',
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

  const handleDownload = async (documentId) => {
    try {
      const doc = documents.find(d => d.id === documentId);
      const response = await documentsAPI.downloadFile(documentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc?.filename || 'document');
      window.document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleContextMenu = (e, doc) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu({ visible: false, position: null, folder: null });
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

  // Folder context menu handlers
  const handleFolderContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: false, position: null, document: null });
    setFolderContextMenu({ visible: false, position: null, folder: null });
    requestAnimationFrame(() => {
      setFolderContextMenu({
        visible: true,
        position: { x: e.clientX, y: e.clientY },
        folder,
      });
    });
  };

  const closeFolderContextMenu = () => {
    setFolderContextMenu({ visible: false, position: null, folder: null });
  };

  // Position folder context menu
  useEffect(() => {
    if (folderContextMenu.visible && folderContextMenu.position) {
      const menuWidth = 150;
      const menuHeight = 140;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = folderContextMenu.position.x;
      let y = folderContextMenu.position.y;
      if (x + menuWidth > vw - 10) x = vw - menuWidth - 10;
      if (y + menuHeight > vh - 10) y = vh - menuHeight - 10;
      if (x < 10) x = 10;
      if (y < 10) y = 10;
      setFolderMenuPos({ x, y });
    }
  }, [folderContextMenu.visible, folderContextMenu.position]);

  // Close folder context menu on outside click/escape/scroll
  useEffect(() => {
    if (!folderContextMenu.visible) return;
    const handleClickOutside = (e) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target)) {
        closeFolderContextMenu();
      }
    };
    const handleEscape = (e) => { if (e.key === 'Escape') closeFolderContextMenu(); };
    const handleScroll = () => closeFolderContextMenu();
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [folderContextMenu.visible]);

  const handleFolderRenameClick = () => {
    if (folderContextMenu.folder) {
      setRenameFolderData(folderContextMenu.folder);
      setRenameFolderValue(folderContextMenu.folder.name);
      onFolderRenameOpen();
    }
  };

  const handleFolderRenameConfirm = async () => {
    if (!renameFolderValue.trim() || !renameFolderData) return;
    try {
      await foldersAPI.update(renameFolderData.id, { name: renameFolderValue.trim() });
      toast({ title: 'Folder renamed', description: 'Folder has been renamed successfully', status: 'success', duration: 3000, isClosable: true });
      if (onFolderRefresh) onFolderRefresh();
      else if (onDelete) onDelete();
    } catch (error) {
      toast({ title: 'Rename failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    } finally {
      onFolderRenameClose();
      setRenameFolderData(null);
      setRenameFolderValue('');
    }
  };

  const handleFolderDeleteClick = () => {
    if (folderContextMenu.folder) {
      setDeleteFolderId(folderContextMenu.folder.id);
      setDeleteFolderName(folderContextMenu.folder.name);
      onFolderDeleteOpen();
    }
  };

  const handleFolderDeleteConfirm = async () => {
    if (!deleteFolderId) return;
    try {
      await foldersAPI.delete(deleteFolderId);
      toast({ title: 'Folder deleted', description: 'Folder has been deleted successfully', status: 'success', duration: 3000, isClosable: true });
      if (onFolderRefresh) onFolderRefresh();
      else if (onDelete) onDelete();
    } catch (error) {
      toast({ title: 'Delete failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    } finally {
      onFolderDeleteClose();
      setDeleteFolderId(null);
      setDeleteFolderName('');
    }
  };

  const handleRename = (doc) => {
    if (onRename) {
      onRename(doc);
    }
  };

  const handleCopy = async (docId) => {
    if (onCopy) {
      onCopy(docId);
    } else {
      try {
        await documentsAPI.copy(docId);
        toast({
          title: 'Copy created',
          description: 'A copy of the document has been created',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        if (onDelete) onDelete(); // Refresh list
      } catch (error) {
        toast({
          title: 'Copy failed',
          description: error.response?.data?.detail || 'An error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  const handleMoveToFolder = (docId, folderId) => {
    if (onMoveToFolder) {
      onMoveToFolder(docId, folderId);
    }
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
            <FiFile size={48} color="#3d4148" />
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

  // Inline folder card component
  const InlineFolderCard = ({ folder }) => {
    const scopeDisplay = getFolderScopeDisplay(folder);
    return (
      <Box
        p={4}
        border="1px"
        borderColor="whiteAlpha.100"
        borderRadius="md"
        transition="all 0.15s"
        cursor="pointer"
        onClick={() => onFolderNavigate && onFolderNavigate(folder.id)}
        onContextMenu={(e) => handleFolderContextMenu(e, folder)}
        _hover={{ bg: 'whiteAlpha.50', borderColor: 'whiteAlpha.200' }}
      >
        <HStack spacing={3}>
          <Icon as={FiFolder} boxSize={5} color="accent.400" />
          <VStack align="start" spacing={0} flex={1} minW={0}>
            <Text color="white" fontWeight="medium" fontSize="sm" noOfLines={1}>
              {folder.name}
            </Text>
            <HStack spacing={2}>
              <Text color="gray.500" fontSize="xs">
                {folder.document_count || 0} file{folder.document_count !== 1 ? 's' : ''}
                {folder.subfolder_count > 0 && ` · ${folder.subfolder_count} folder${folder.subfolder_count !== 1 ? 's' : ''}`}
              </Text>
              <HStack spacing={1} fontSize="xs">
                <Icon as={scopeDisplay.icon} boxSize={3} color={scopeDisplay.color} />
                <Text color={scopeDisplay.color}>{scopeDisplay.text}</Text>
              </HStack>
            </HStack>
          </VStack>
          <Icon as={FiChevronRight} boxSize={4} color="gray.600" />
        </HStack>
      </Box>
    );
  };

  const getFolderScopeDisplay = (folder) => {
    if (folder.scope === 'organization') {
      if (folder.group_name) {
        return { icon: FiUsers, text: folder.group_name, color: 'purple.400' };
      }
      return { icon: FiGlobe, text: currentUser.organization_name || 'Organization', color: 'blue.400' };
    }
    return { icon: FiEyeOff, text: 'Only me', color: 'gray.500' };
  };

  // Inline folder row component for list view
  const InlineFolderRow = ({ folder, isHovered, onHover, onLeave }) => {
    const scopeDisplay = getFolderScopeDisplay(folder);
    return (
      <Tr
        bg={isHovered ? 'whiteAlpha.50' : 'transparent'}
        transition="background 0.15s"
        cursor="pointer"
        onClick={() => onFolderNavigate && onFolderNavigate(folder.id)}
        onContextMenu={(e) => handleFolderContextMenu(e, folder)}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        borderBottom="1px"
        borderColor="whiteAlpha.100"
      >
        <Td py={3} px={3}>
          <HStack spacing={3}>
            <Icon as={FiFolder} boxSize={4} color="accent.400" />
            <Text color="white" fontSize="sm" fontWeight="normal" noOfLines={1} maxW="400px">
              {folder.name}
            </Text>
          </HStack>
        </Td>
        <Td py={3} px={3}>
          <HStack spacing={2}>
            <Icon as={scopeDisplay.icon} boxSize={3} color={scopeDisplay.color} />
            <Text color="gray.500" fontSize="sm">{scopeDisplay.text}</Text>
          </HStack>
        </Td>
        <Td py={3} px={3}>
          <Text color="gray.500" fontSize="sm">—</Text>
        </Td>
        <Td py={3} px={3}>
          <Text color="gray.500" fontSize="sm">{folder.updated_at ? formatDate(folder.updated_at) : '—'}</Text>
        </Td>
        <Td py={3} px={3} isNumeric>
          <Text color="gray.500" fontSize="sm">
            {folder.document_count || 0} file{folder.document_count !== 1 ? 's' : ''}
          </Text>
        </Td>
        <Td py={3} px={3}></Td>
      </Tr>
    );
  };

  // Card View - Minimalistic Style
  if (viewMode === 'card') {
    return (
      <>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
          {inlineFolders.map((folder) => (
            <InlineFolderCard key={`folder-${folder.id}`} folder={folder} />
          ))}
          {documents.map((doc) => {
            const fileIconData = getFileIcon(doc.filename);
            const visibilityDisplay = getVisibilityDisplay(doc);
            const isHovered = hoveredCard === doc.id;

            return (
              <Box
                key={doc.id}
                p={4}
                border="1px"
                borderColor="whiteAlpha.100"
                borderRadius="md"
                transition="all 0.15s"
                cursor="pointer"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('documentId', doc.id.toString());
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => onViewDocument(doc.id)}
                onContextMenu={(e) => handleContextMenu(e, doc)}
                onMouseEnter={() => setHoveredCard(doc.id)}
                onMouseLeave={() => setHoveredCard(null)}
                _hover={{
                  bg: 'whiteAlpha.50',
                  borderColor: 'whiteAlpha.200',
                }}
              >
                <VStack align="stretch" spacing={3}>
                  {/* Filename */}
                  <VStack align="start" spacing={1.5}>
                    <Text
                      color="white"
                      fontWeight="medium"
                      fontSize="sm"
                      noOfLines={2}
                      lineHeight="1.4"
                    >
                      {doc.filename}
                    </Text>
                    <Text color="gray.500" fontSize="xs">
                      {getFileExtension(doc.filename)} • {formatFileSize(doc.file_size)}
                    </Text>
                  </VStack>

                  {/* Metadata */}
                  <VStack align="stretch" spacing={1.5} fontSize="xs" color="gray.500">
                    <HStack spacing={1.5}>
                      <Icon as={visibilityDisplay.icon} boxSize={3} color={visibilityDisplay.color} />
                      <Text>{visibilityDisplay.text}</Text>
                    </HStack>
                    <HStack spacing={1.5}>
                      <Icon as={FiUser} boxSize={3} />
                      <Text>{doc.uploaded_by_username}</Text>
                    </HStack>
                    <HStack spacing={1.5}>
                      <Icon as={FiClock} boxSize={3} />
                      <Text>{formatDate(doc.uploaded_at)}</Text>
                    </HStack>
                  </VStack>

                  {/* Actions */}
                  <HStack
                    spacing={0}
                    pt={2}
                    onClick={(e) => e.stopPropagation()}
                    opacity={isHovered ? 1 : 0}
                    transition="opacity 0.15s"
                  >
                    <Tooltip label="View">
                      <IconButton
                        icon={<FiEye />}
                        size="xs"
                        variant="ghost"
                        color="gray.500"
                        onClick={() => onViewDocument(doc.id)}
                        aria-label="View document"
                        _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                      />
                    </Tooltip>
                    <Tooltip label="Download">
                      <IconButton
                        icon={<FiDownload />}
                        size="xs"
                        variant="ghost"
                        color="gray.500"
                        onClick={() => handleDownload(doc.id)}
                        aria-label="Download document"
                        _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                      />
                    </Tooltip>
                    {canAddToGroup(doc) && (
                      <Tooltip label="Add to Group">
                        <IconButton
                          icon={<FiUserPlus />}
                          size="xs"
                          variant="ghost"
                          color="gray.500"
                          onClick={() => handleAddToGroupClick(doc)}
                          aria-label="Add to group"
                          _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                        />
                      </Tooltip>
                    )}
                    {canDelete(doc) && (
                      <Tooltip label="Delete">
                        <IconButton
                          icon={<FiTrash2 />}
                          size="xs"
                          variant="ghost"
                          color="gray.500"
                          onClick={() => handleDeleteClick(doc.id, doc.filename)}
                          aria-label="Delete document"
                          _hover={{ color: 'red.400', bg: 'whiteAlpha.100' }}
                        />
                      </Tooltip>
                    )}
                  </HStack>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>

        {/* Context Menu */}
        <ContextMenu
          position={contextMenu.position}
          document={contextMenu.document}
          isVisible={contextMenu.visible}
          onClose={closeContextMenu}
          onView={(docId) => onViewFullScreen ? onViewFullScreen(docId) : onViewDocument(docId)}
          onDownload={handleDownload}
          onRename={handleRename}
          onCopy={handleCopy}
          onDelete={handleDeleteClick}
          onAddToGroup={handleAddToGroupClick}
          onCreateGroup={handleAddToGroupClick}
          onMoveToFolder={handleMoveToFolder}
          groups={groups}
          folders={folders}
          canDelete={contextMenu.document ? canDelete(contextMenu.document) : false}
          canAddToGroup={contextMenu.document ? canAddToGroup(contextMenu.document) : false}
        />

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
                    This document will be moved to trash. You can restore it later.
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

        <AddDocumentToGroupModal
          isOpen={isAddToGroupOpen}
          onClose={onAddToGroupClose}
          document={addToGroupDocument}
          onSuccess={handleAddToGroupSuccess}
        />

        {/* Folder Rename Modal */}
        <Modal isOpen={isFolderRenameOpen} onClose={onFolderRenameClose} isCentered>
          <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
          <ModalContent bg="primary.800" border="1px" borderColor="primary.600">
            <ModalHeader color="white">Rename Folder</ModalHeader>
            <ModalBody>
              <Input
                value={renameFolderValue}
                onChange={(e) => setRenameFolderValue(e.target.value)}
                placeholder="Folder name"
                color="white"
                _placeholder={{ color: 'gray.500' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFolderRenameConfirm();
                  }
                }}
                autoFocus
              />
            </ModalBody>
            <ModalFooter gap={3}>
              <Button variant="ghost" color="gray.400" onClick={onFolderRenameClose}>
                Cancel
              </Button>
              <Button bg="accent.500" color="white" onClick={handleFolderRenameConfirm} isDisabled={!renameFolderValue.trim()}>
                Rename
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Folder Delete Alert Dialog */}
        <AlertDialog isOpen={isFolderDeleteOpen} leastDestructiveRef={folderDeleteCancelRef} onClose={onFolderDeleteClose} isCentered>
          <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
          <AlertDialogContent bg="primary.800" border="1px" borderColor="primary.600">
            <AlertDialogHeader color="white" fontSize="lg" fontWeight="bold">
              Delete Folder
            </AlertDialogHeader>
            <AlertDialogBody color="gray.300">
              Are you sure you want to delete "{deleteFolderName}"? Documents inside will be moved to the parent folder.
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={folderDeleteCancelRef} variant="ghost" color="gray.400" onClick={onFolderDeleteClose}>
                Cancel
              </Button>
              <Button bg="red.600" color="white" onClick={handleFolderDeleteConfirm}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Folder Context Menu */}
        {folderContextMenu.visible && folderContextMenu.folder && createPortal(
          <Box
            ref={folderMenuRef}
            position="fixed"
            left={`${folderMenuPos.x}px`}
            top={`${folderMenuPos.y}px`}
            bg="primary.700"
            border="1px"
            borderColor="primary.600"
            rounded="md"
            py={1}
            px={1}
            minW="150px"
            zIndex={10000}
            boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
            onContextMenu={(e) => e.preventDefault()}
          >
            <VStack spacing={0} align="stretch">
              <Box px={3} py={2} borderBottom="1px" borderColor="primary.600" mb={1}>
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {folderContextMenu.folder.name}
                </Text>
              </Box>
              <HStack
                px={3} py={2} cursor="pointer" rounded="md"
                _hover={{ bg: 'primary.600' }} spacing={2}
                onClick={() => {
                  onFolderNavigate && onFolderNavigate(folderContextMenu.folder.id);
                  closeFolderContextMenu();
                }}
              >
                <Icon as={FiChevronRight} boxSize={4} color="gray.400" />
                <Text fontSize="sm" color="gray.200">Open</Text>
              </HStack>
              <HStack
                px={3} py={2} cursor="pointer" rounded="md"
                _hover={{ bg: 'primary.600' }} spacing={2}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFolderRenameClick();
                  closeFolderContextMenu();
                }}
              >
                <Icon as={FiEdit2Icon} boxSize={4} color="gray.400" />
                <Text fontSize="sm" color="gray.200">Rename</Text>
              </HStack>
              <HStack
                px={3} py={2} cursor="pointer" rounded="md"
                _hover={{ bg: 'red.900' }} spacing={2}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFolderDeleteClick();
                  closeFolderContextMenu();
                }}
              >
                <Icon as={FiTrash2} boxSize={4} color="red.400" />
                <Text fontSize="sm" color="red.400">Delete</Text>
              </HStack>
            </VStack>
          </Box>,
          document.body
        )}
      </>
    );
  }

  // List View
  return (
    <>
      <Box overflow="hidden">
        <Table variant="unstyled" size="sm">
          <Thead>
            <Tr borderBottom="1px" borderColor="whiteAlpha.200">
              <Th
                color="gray.500"
                fontSize="xs"
                textTransform="none"
                fontWeight="normal"
                py={3}
                px={3}
              >
                Name
              </Th>
              <Th
                color="gray.500"
                fontSize="xs"
                textTransform="none"
                fontWeight="normal"
                py={3}
                px={3}
              >
                Shared With
              </Th>
              <Th
                color="gray.500"
                fontSize="xs"
                textTransform="none"
                fontWeight="normal"
                py={3}
                px={3}
              >
                Uploaded By
              </Th>
              <Th
                color="gray.500"
                fontSize="xs"
                textTransform="none"
                fontWeight="normal"
                py={3}
                px={3}
              >
                Date Modified
              </Th>
              <Th
                color="gray.500"
                fontSize="xs"
                textTransform="none"
                fontWeight="normal"
                py={3}
                px={3}
                isNumeric
              >
                Size
              </Th>
              <Th
                color="gray.500"
                fontSize="xs"
                textTransform="none"
                fontWeight="normal"
                py={3}
                px={3}
                w="120px"
              >
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {inlineFolders.map((folder) => (
              <InlineFolderRow
                key={`folder-${folder.id}`}
                folder={folder}
                isHovered={hoveredRow === `folder-${folder.id}`}
                onHover={() => setHoveredRow(`folder-${folder.id}`)}
                onLeave={() => setHoveredRow(null)}
              />
            ))}
            {documents.map((doc) => {
              const fileIconData = getFileIcon(doc.filename);
              const visibilityDisplay = getVisibilityDisplay(doc);
              const isHovered = hoveredRow === doc.id;

              return (
                <Tr
                  key={doc.id}
                  bg={isHovered ? 'whiteAlpha.50' : 'transparent'}
                  transition="background 0.15s"
                  cursor="pointer"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('documentId', doc.id.toString());
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={() => onViewDocument(doc.id)}
                  onContextMenu={(e) => handleContextMenu(e, doc)}
                  onMouseEnter={() => setHoveredRow(doc.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  borderBottom="1px"
                  borderColor="whiteAlpha.100"
                  _last={{ borderBottom: 'none' }}
                >
                  <Td py={3} px={3}>
                    <HStack spacing={3}>
                      <Icon
                        as={fileIconData.icon}
                        boxSize={4}
                        color={fileIconData.color}
                      />
                      <Text
                        color="white"
                        fontSize="sm"
                        fontWeight="normal"
                        noOfLines={1}
                        maxW="400px"
                      >
                        {doc.filename}
                      </Text>
                    </HStack>
                  </Td>
                  <Td py={3} px={3}>
                    <HStack spacing={2}>
                      <Icon as={visibilityDisplay.icon} boxSize={3} color={visibilityDisplay.color} />
                      <Text color="gray.500" fontSize="sm" fontWeight="normal">
                        {visibilityDisplay.text}
                      </Text>
                    </HStack>
                  </Td>
                  <Td py={3} px={3}>
                    <Text color="gray.500" fontSize="sm" fontWeight="normal">
                      {doc.uploaded_by_username}
                    </Text>
                  </Td>
                  <Td py={3} px={3}>
                    <Text color="gray.500" fontSize="sm" fontWeight="normal">
                      {formatDate(doc.uploaded_at)}
                    </Text>
                  </Td>
                  <Td py={3} px={3} isNumeric>
                    <Text color="gray.500" fontSize="sm" fontWeight="normal">
                      {formatFileSize(doc.file_size)}
                    </Text>
                  </Td>
                  <Td
                    py={3}
                    px={3}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HStack
                      spacing={0}
                      justify="flex-end"
                      opacity={isHovered ? 1 : 0}
                      transition="opacity 0.15s"
                    >
                      <Tooltip label="View">
                        <IconButton
                          icon={<FiEye />}
                          size="xs"
                          variant="ghost"
                          color="gray.500"
                          onClick={() => onViewDocument(doc.id)}
                          aria-label="View document"
                          _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
                        />
                      </Tooltip>
                      <Tooltip label="Download">
                        <IconButton
                          icon={<FiDownload />}
                          size="xs"
                          variant="ghost"
                          color="gray.500"
                          onClick={() => handleDownload(doc.id)}
                          aria-label="Download"
                          _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
                        />
                      </Tooltip>
                      {canAddToGroup(doc) && (
                        <Tooltip label="Add to Group">
                          <IconButton
                            icon={<FiUserPlus />}
                            size="xs"
                            variant="ghost"
                            color="gray.500"
                            onClick={() => handleAddToGroupClick(doc)}
                            aria-label="Add to group"
                            _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
                          />
                        </Tooltip>
                      )}
                      {canDelete(doc) && (
                        <Tooltip label="Delete">
                          <IconButton
                            icon={<FiTrash2 />}
                            size="xs"
                            variant="ghost"
                            color="gray.500"
                            onClick={() => handleDeleteClick(doc.id, doc.filename)}
                            aria-label="Delete document"
                            _hover={{ bg: 'whiteAlpha.100', color: 'red.400' }}
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

      {/* Context Menu */}
      <ContextMenu
        position={contextMenu.position}
        document={contextMenu.document}
        isVisible={contextMenu.visible}
        onClose={closeContextMenu}
        onView={(docId) => onViewFullScreen ? onViewFullScreen(docId) : onViewDocument(docId)}
        onDownload={handleDownload}
        onRename={handleRename}
        onCopy={handleCopy}
        onDelete={handleDeleteClick}
        onAddToGroup={handleAddToGroupClick}
        onCreateGroup={handleAddToGroupClick}
        onMoveToFolder={handleMoveToFolder}
        groups={groups}
        folders={folders}
        canDelete={contextMenu.document ? canDelete(contextMenu.document) : false}
        canAddToGroup={contextMenu.document ? canAddToGroup(contextMenu.document) : false}
      />

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
                  This document will be moved to trash. You can restore it later.
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

      {/* Add to Group Modal */}
      <AddDocumentToGroupModal
        isOpen={isAddToGroupOpen}
        onClose={onAddToGroupClose}
        document={addToGroupDocument}
        onSuccess={handleAddToGroupSuccess}
      />

      {/* Folder Rename Modal */}
      <Modal isOpen={isFolderRenameOpen} onClose={onFolderRenameClose} isCentered>
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <ModalContent bg="primary.800" border="1px" borderColor="primary.600">
          <ModalHeader color="white">Rename Folder</ModalHeader>
          <ModalBody>
            <Input
              value={renameFolderValue}
              onChange={(e) => setRenameFolderValue(e.target.value)}
              placeholder="Folder name"
              color="white"
              _placeholder={{ color: 'gray.500' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFolderRenameConfirm();
                }
              }}
              autoFocus
            />
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" color="gray.400" onClick={onFolderRenameClose}>
              Cancel
            </Button>
            <Button bg="accent.500" color="white" onClick={handleFolderRenameConfirm} isDisabled={!renameFolderValue.trim()}>
              Rename
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Folder Delete Alert Dialog */}
      <AlertDialog isOpen={isFolderDeleteOpen} leastDestructiveRef={folderDeleteCancelRef} onClose={onFolderDeleteClose} isCentered>
        <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <AlertDialogContent bg="primary.800" border="1px" borderColor="primary.600">
          <AlertDialogHeader color="white" fontSize="lg" fontWeight="bold">
            Delete Folder
          </AlertDialogHeader>
          <AlertDialogBody color="gray.300">
            Are you sure you want to delete "{deleteFolderName}"? Documents inside will be moved to the parent folder.
          </AlertDialogBody>
          <AlertDialogFooter gap={3}>
            <Button ref={folderDeleteCancelRef} variant="ghost" color="gray.400" onClick={onFolderDeleteClose}>
              Cancel
            </Button>
            <Button bg="red.600" color="white" onClick={handleFolderDeleteConfirm}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folder Context Menu */}
      {folderContextMenu.visible && folderContextMenu.folder && createPortal(
        <Box
          ref={folderMenuRef}
          position="fixed"
          left={`${folderMenuPos.x}px`}
          top={`${folderMenuPos.y}px`}
          bg="primary.700"
          border="1px"
          borderColor="primary.600"
          rounded="md"
          py={1}
          px={1}
          minW="150px"
          zIndex={10000}
          boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
          onContextMenu={(e) => e.preventDefault()}
        >
          <VStack spacing={0} align="stretch">
            <Box px={3} py={2} borderBottom="1px" borderColor="primary.600" mb={1}>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {folderContextMenu.folder.name}
              </Text>
            </Box>
            <HStack
              px={3} py={2} cursor="pointer" rounded="md"
              _hover={{ bg: 'primary.600' }} spacing={2}
              onClick={() => {
                onFolderNavigate && onFolderNavigate(folderContextMenu.folder.id);
                closeFolderContextMenu();
              }}
            >
              <Icon as={FiChevronRight} boxSize={4} color="gray.400" />
              <Text fontSize="sm" color="gray.200">Open</Text>
            </HStack>
            <HStack
              px={3} py={2} cursor="pointer" rounded="md"
              _hover={{ bg: 'primary.600' }} spacing={2}
              onClick={(e) => {
                e.stopPropagation();
                handleFolderRenameClick();
                closeFolderContextMenu();
              }}
            >
              <Icon as={FiEdit2Icon} boxSize={4} color="gray.400" />
              <Text fontSize="sm" color="gray.200">Rename</Text>
            </HStack>
            <HStack
              px={3} py={2} cursor="pointer" rounded="md"
              _hover={{ bg: 'red.900' }} spacing={2}
              onClick={(e) => {
                e.stopPropagation();
                handleFolderDeleteClick();
                closeFolderContextMenu();
              }}
            >
              <Icon as={FiTrash2} boxSize={4} color="red.400" />
              <Text fontSize="sm" color="red.400">Delete</Text>
            </HStack>
          </VStack>
        </Box>,
        document.body
      )}
    </>
  );
};

export default DocumentList;