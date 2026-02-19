import { useState, useRef } from 'react';
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
  FiFileText,
  FiUsers,
  FiEyeOff,
  FiGlobe,
  FiClock,
  FiUserPlus,
  FiPackage,
  FiFolder,
  FiChevronRight,
  FiMoreVertical,
  FiEdit2,
} from 'react-icons/fi';
import { documentsAPI, foldersAPI } from '../utils/api';
import { formatFileSize, formatDate } from '../utils/formatters';
import AddDocumentToGroupModal from './user_groups/AddDocumentToGroupModal';
import ContextMenu from './ContextMenu';
import FolderContextMenu from './FolderContextMenu';
import DownloadStatusPanel from './DownloadStatusPanel';

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
  allFolders = [],
  onMoveFolder,
  onAddFolderToGroup,
}) => {
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredFolderCard, setHoveredFolderCard] = useState(null);
  const [addToGroupDocument, setAddToGroupDocument] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, document: null });
  const [folderContextMenu, setFolderContextMenu] = useState({ visible: false, position: null, folder: null });
  const [folderDownloads, setFolderDownloads] = useState([]);

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
      if (onDelete) onDelete();
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

  const isCreator = (doc) => {
    return doc.uploaded_by_username === currentUser.username || doc.uploaded_by_id === currentUser.id;
  };

  const canDelete = (doc) => {
    // Creator has highest permissions - can always delete their own documents
    return currentUser.role === 'admin' || isCreator(doc);
  };

  const canAddToGroup = (doc) => {
    // Creator has highest permissions - can always add their own documents to groups
    return currentUser.role === 'admin' || isCreator(doc);
  };

  const handleAddToGroupClick = (doc) => {
    setAddToGroupDocument(doc);
    onAddToGroupOpen();
  };

  const handleAddToGroupSuccess = () => {
    if (onDelete) onDelete();
    onAddToGroupClose();
  };

  const getFileExtension = (filename) => filename.split('.').pop().toUpperCase();

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    if (ext === 'pdf') return { icon: FiFileText, color: 'red.400' };
    if (ext === 'doc' || ext === 'docx') return { icon: FiFileText, color: 'blue.400' };
    if (ext === 'txt') return { icon: FiFileText, color: 'gray.400' };
    return { icon: FiFile, color: 'accent.400' };
  };

  const getVisibilityDisplay = (doc) => {
    if (doc.visibility === 'group' && doc.user_group_name) {
      return { icon: FiUsers, text: doc.user_group_name, color: 'accent.400' };
    }
    if (doc.visibility === 'organization') {
      return { icon: FiPackage, text: currentUser.organization_name || 'Organization', color: 'blue.400' };
    }
    if (doc.visibility === 'public') {
      return { icon: FiGlobe, text: 'Everyone', color: 'green.400' };
    }
    return { icon: FiEyeOff, text: 'Only me', color: 'gray.500' };
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
      toast({ title: 'Download started', status: 'success', duration: 2000, isClosable: true });
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

  const handleFolderDownload = async (folder) => {
    const dlId = Date.now();
    setFolderDownloads(prev => [...prev, { id: dlId, name: folder.name, status: 'preparing' }]);
    try {
      setFolderDownloads(prev => prev.map(d => d.id === dlId ? { ...d, status: 'downloading' } : d));
      const response = await foldersAPI.downloadZip(folder.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${folder.name}.zip`);
      window.document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      setFolderDownloads(prev => prev.map(d => d.id === dlId ? { ...d, status: 'done' } : d));
    } catch {
      setFolderDownloads(prev => prev.map(d => d.id === dlId ? { ...d, status: 'error' } : d));
    }
  };

  const handleContextMenu = (e, doc) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu(prev => ({ ...prev, visible: false }));
    setContextMenu({ visible: true, position: { x: e.clientX, y: e.clientY }, document: doc });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, position: null, document: null });
  };

  const handleFolderContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(prev => ({ ...prev, visible: false }));
    setFolderContextMenu({ visible: true, position: { x: e.clientX, y: e.clientY }, folder });
  };

  const closeFolderContextMenu = () => {
    setFolderContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleFolderRenameClick = (folderArg) => {
    const f = folderArg || folderContextMenu.folder;
    if (f) {
      setRenameFolderData(f);
      setRenameFolderValue(f.name);
      onFolderRenameOpen();
    }
  };

  const handleFolderRenameConfirm = async () => {
    if (!renameFolderValue.trim() || !renameFolderData) return;
    try {
      await foldersAPI.update(renameFolderData.id, { name: renameFolderValue.trim() });
      toast({ title: 'Folder renamed', status: 'success', duration: 3000, isClosable: true });
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

  const handleFolderDeleteClick = (folderArg) => {
    const f = folderArg || folderContextMenu.folder;
    if (f) {
      setDeleteFolderId(f.id);
      setDeleteFolderName(f.name);
      onFolderDeleteOpen();
    }
  };

  const handleFolderDeleteConfirm = async () => {
    if (!deleteFolderId) return;
    try {
      await foldersAPI.delete(deleteFolderId);
      toast({ title: 'Folder deleted', status: 'success', duration: 3000, isClosable: true });
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
    if (onRename) onRename(doc);
  };

  const handleCopy = async (docId) => {
    if (onCopy) {
      onCopy(docId);
    } else {
      try {
        await documentsAPI.copy(docId);
        toast({ title: 'Copy created', status: 'success', duration: 3000, isClosable: true });
        if (onDelete) onDelete();
      } catch (error) {
        toast({ title: 'Copy failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
      }
    }
  };

  const handleMoveToFolder = (docId, folderId) => {
    if (onMoveToFolder) onMoveToFolder(docId, folderId);
  };

  const handleMoreActionsClick = (e, doc) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setFolderContextMenu(prev => ({ ...prev, visible: false }));
    setContextMenu({ visible: true, position: { x: rect.left, y: rect.bottom + 4 }, document: doc });
  };

  const handleFolderMoreActionsClick = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu(prev => ({ ...prev, visible: false }));
    setFolderContextMenu({ visible: true, position: { x: rect.left, y: rect.bottom + 4 }, folder });
  };

  const handleMoveFolderAction = async (folderId, targetParentId) => {
    if (onMoveFolder) {
      onMoveFolder(folderId, targetParentId);
    } else {
      try {
        await foldersAPI.move(folderId, targetParentId);
        toast({ title: 'Folder moved', status: 'success', duration: 3000, isClosable: true });
        if (onFolderRefresh) onFolderRefresh();
        else if (onDelete) onDelete();
      } catch (error) {
        toast({ title: 'Move failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
      }
    }
  };

  const handleAddFolderToGroupAction = async (folder, groupId) => {
    if (onAddFolderToGroup) {
      onAddFolderToGroup(folder, groupId);
    } else {
      try {
        await foldersAPI.update(folder.id, { group_id: groupId });
        toast({ title: 'Folder added to group', status: 'success', duration: 3000, isClosable: true });
        if (onFolderRefresh) onFolderRefresh();
        else if (onDelete) onDelete();
      } catch (error) {
        toast({ title: 'Failed to add to group', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
      }
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
          <Box p={6} bg="primary.800" rounded="full" border="2px dashed" borderColor="primary.600">
            <FiFile size={48} color="#3d4148" />
          </Box>
          <Text fontSize="lg" color="white" fontWeight="medium">{emptyMessage}</Text>
          <Text color="gray.400" fontSize="sm" textAlign="center" maxW="300px">
            Upload your first document to get started
          </Text>
        </VStack>
      </Center>
    );
  }

  const getFolderScopeDisplay = (folder) => {
    if (folder.scope === 'organization') {
      if (folder.group_name) return { icon: FiUsers, text: folder.group_name, color: 'purple.400' };
      return { icon: FiGlobe, text: currentUser.organization_name || 'Organization', color: 'blue.400' };
    }
    return { icon: FiEyeOff, text: 'Only me', color: 'gray.500' };
  };

  // Inline folder card component - Google Drive style (only ⋮ button inline)
  const InlineFolderCard = ({ folder }) => {
    const scopeDisplay = getFolderScopeDisplay(folder);
    const isHovered = hoveredFolderCard === folder.id;
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
        onMouseEnter={() => setHoveredFolderCard(folder.id)}
        onMouseLeave={() => setHoveredFolderCard(null)}
        _hover={{ bg: 'whiteAlpha.50', borderColor: 'whiteAlpha.200' }}
      >
        <HStack spacing={3}>
          <Icon as={FiFolder} boxSize={5} color="accent.400" flexShrink={0} />
          <VStack align="start" spacing={0} flex={1} minW={0}>
            <HStack spacing={1} w="100%">
              <Text color="white" fontWeight="medium" fontSize="sm" noOfLines={1} flex={1}>
                {folder.name}
              </Text>
              <IconButton
                icon={<FiMoreVertical />}
                size="xs"
                variant="ghost"
                color="gray.500"
                onClick={(e) => { e.stopPropagation(); handleFolderMoreActionsClick(e, folder); }}
                aria-label="More actions"
                opacity={isHovered ? 1 : 0}
                transition="opacity 0.15s"
                _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                flexShrink={0}
              />
            </HStack>
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
        </HStack>
      </Box>
    );
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
        <Td py={3} px={3} onClick={(e) => e.stopPropagation()}>
          <HStack spacing={0} justify="flex-end" align="center">
            <Tooltip label="More actions">
              <IconButton
                icon={<FiMoreVertical />}
                size="xs"
                variant="ghost"
                color="gray.500"
                onClick={(e) => handleFolderMoreActionsClick(e, folder)}
                aria-label="More actions"
                opacity={isHovered ? 1 : 0}
                transition="opacity 0.15s"
                _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
              />
            </Tooltip>
          </HStack>
        </Td>
      </Tr>
    );
  };

  // Shared dialogs/modals/menus rendered once, used by both views
  const SharedOverlays = () => (
    <>
      {/* Document Context Menu */}
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

      {/* Folder Context Menu */}
      <FolderContextMenu
        position={folderContextMenu.position}
        folder={folderContextMenu.folder}
        isVisible={folderContextMenu.visible}
        onClose={closeFolderContextMenu}
        onOpen={(folderId) => { onFolderNavigate && onFolderNavigate(folderId); }}
        onDownload={handleFolderDownload}
        onRename={(f) => handleFolderRenameClick(f)}
        onDelete={(f) => handleFolderDeleteClick(f)}
        onMoveToFolder={handleMoveFolderAction}
        onAddToGroup={handleAddFolderToGroupAction}
        folders={allFolders.length > 0 ? allFolders : [...inlineFolders, ...folders]}
        groups={groups}
      />

      {/* Document Delete Dialog */}
      <AlertDialog isOpen={isOpen} onClose={onClose} isCentered>
        <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <AlertDialogContent bg="primary.800" border="1px" borderColor="red.500" mx={4}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
            <HStack spacing={3}>
              <Box p={2} bg="red.500" rounded="lg"><FiTrash2 size={20} color="white" /></Box>
              <Text>Delete Document</Text>
            </HStack>
          </AlertDialogHeader>
          <AlertDialogBody color="gray.300">
            <VStack align="start" spacing={3}>
              <Text>
                Are you sure you want to delete <Text as="span" fontWeight="bold" color="white">{deleteName}</Text>?
              </Text>
              <Box p={3} bg="red.900" border="1px" borderColor="red.700" rounded="md" w="full">
                <Text fontSize="sm" color="red.200">This document will be moved to trash. You can restore it later.</Text>
              </Box>
            </VStack>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button onClick={onClose} variant="ghost" color="gray.400" _hover={{ bg: 'primary.700' }}>Cancel</Button>
            <Button colorScheme="red" onClick={handleDeleteConfirm} ml={3} leftIcon={<FiTrash2 />}>Delete Document</Button>
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
              onKeyDown={(e) => { if (e.key === 'Enter') handleFolderRenameConfirm(); }}
              autoFocus
            />
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" color="gray.400" onClick={onFolderRenameClose}>Cancel</Button>
            <Button bg="accent.500" color="white" onClick={handleFolderRenameConfirm} isDisabled={!renameFolderValue.trim()}>Rename</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Folder Delete Alert Dialog */}
      <AlertDialog isOpen={isFolderDeleteOpen} leastDestructiveRef={folderDeleteCancelRef} onClose={onFolderDeleteClose} isCentered>
        <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <AlertDialogContent bg="primary.800" border="1px" borderColor="primary.600">
          <AlertDialogHeader color="white" fontSize="lg" fontWeight="bold">Delete Folder</AlertDialogHeader>
          <AlertDialogBody color="gray.300">
            Are you sure you want to delete "{deleteFolderName}"? Documents inside will be moved to the parent folder.
          </AlertDialogBody>
          <AlertDialogFooter gap={3}>
            <Button ref={folderDeleteCancelRef} variant="ghost" color="gray.400" onClick={onFolderDeleteClose}>Cancel</Button>
            <Button bg="red.600" color="white" onClick={handleFolderDeleteConfirm}>Delete</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Download Status Panel */}
      <DownloadStatusPanel
        downloads={folderDownloads}
        onDismiss={(id) => setFolderDownloads(prev => prev.filter(d => d.id !== id))}
        onDismissAll={() => setFolderDownloads([])}
      />
    </>
  );

  // Card View
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
                _hover={{ bg: 'whiteAlpha.50', borderColor: 'whiteAlpha.200' }}
              >
                <VStack align="stretch" spacing={3}>
                  <VStack align="start" spacing={1.5}>
                    <Text color="white" fontWeight="medium" fontSize="sm" noOfLines={2} lineHeight="1.4">
                      {doc.filename}
                    </Text>
                    <Text color="gray.500" fontSize="xs">
                      {getFileExtension(doc.filename)} • {formatFileSize(doc.file_size)}
                    </Text>
                  </VStack>

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
                  <HStack spacing={0} pt={2} onClick={(e) => e.stopPropagation()} align="center">
                    <HStack spacing={0} flex={1} opacity={isHovered ? 1 : 0} transition="opacity 0.15s">
                      <Tooltip label="View">
                        <IconButton icon={<FiEye />} size="xs" variant="ghost" color="gray.500"
                          onClick={() => onViewDocument(doc.id)} aria-label="View document"
                          _hover={{ color: 'white', bg: 'whiteAlpha.100' }} />
                      </Tooltip>
                      <Tooltip label="Download">
                        <IconButton icon={<FiDownload />} size="xs" variant="ghost" color="gray.500"
                          onClick={() => handleDownload(doc.id)} aria-label="Download document"
                          _hover={{ color: 'white', bg: 'whiteAlpha.100' }} />
                      </Tooltip>
                      <Tooltip label="Rename">
                        <IconButton icon={<FiEdit2 />} size="xs" variant="ghost" color="gray.500"
                          onClick={() => handleRename(doc)} aria-label="Rename document"
                          _hover={{ color: 'white', bg: 'whiteAlpha.100' }} />
                      </Tooltip>
                      {canAddToGroup(doc) && (
                        <Tooltip label="Add to Group">
                          <IconButton icon={<FiUserPlus />} size="xs" variant="ghost" color="gray.500"
                            onClick={() => handleAddToGroupClick(doc)} aria-label="Add to group"
                            _hover={{ color: 'white', bg: 'whiteAlpha.100' }} />
                        </Tooltip>
                      )}
                      {canDelete(doc) && (
                        <Tooltip label="Delete">
                          <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" color="gray.500"
                            onClick={() => handleDeleteClick(doc.id, doc.filename)} aria-label="Delete document"
                            _hover={{ color: 'red.400', bg: 'whiteAlpha.100' }} />
                        </Tooltip>
                      )}
                    </HStack>
                    <Tooltip label="More actions">
                      <IconButton icon={<FiMoreVertical />} size="xs" variant="ghost" color="gray.500"
                        onClick={(e) => handleMoreActionsClick(e, doc)} aria-label="More actions"
                        _hover={{ color: 'white', bg: 'whiteAlpha.100' }} />
                    </Tooltip>
                  </HStack>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>

        {SharedOverlays()}
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
              {['Name', 'Shared With', 'Uploaded By', 'Date Modified'].map((h) => (
                <Th key={h} color="gray.500" fontSize="xs" textTransform="none" fontWeight="normal" py={3} px={3}>{h}</Th>
              ))}
              <Th color="gray.500" fontSize="xs" textTransform="none" fontWeight="normal" py={3} px={3} isNumeric>Size</Th>
              <Th color="gray.500" fontSize="xs" textTransform="none" fontWeight="normal" py={3} px={3} w="160px" />
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
                      <Icon as={fileIconData.icon} boxSize={4} color={fileIconData.color} />
                      <Text color="white" fontSize="sm" fontWeight="normal" noOfLines={1} maxW="400px">
                        {doc.filename}
                      </Text>
                    </HStack>
                  </Td>
                  <Td py={3} px={3}>
                    <HStack spacing={2}>
                      <Icon as={visibilityDisplay.icon} boxSize={3} color={visibilityDisplay.color} />
                      <Text color="gray.500" fontSize="sm" fontWeight="normal">{visibilityDisplay.text}</Text>
                    </HStack>
                  </Td>
                  <Td py={3} px={3}>
                    <Text color="gray.500" fontSize="sm" fontWeight="normal">{doc.uploaded_by_username}</Text>
                  </Td>
                  <Td py={3} px={3}>
                    <Text color="gray.500" fontSize="sm" fontWeight="normal">{formatDate(doc.uploaded_at)}</Text>
                  </Td>
                  <Td py={3} px={3} isNumeric>
                    <Text color="gray.500" fontSize="sm" fontWeight="normal">{formatFileSize(doc.file_size)}</Text>
                  </Td>
                  <Td py={3} px={3} onClick={(e) => e.stopPropagation()}>
                    <HStack spacing={0} justify="flex-end" align="center">
                      <HStack spacing={0} opacity={isHovered ? 1 : 0} transition="opacity 0.15s">
                        <Tooltip label="View">
                          <IconButton icon={<FiEye />} size="xs" variant="ghost" color="gray.500"
                            onClick={() => onViewDocument(doc.id)} aria-label="View document"
                            _hover={{ bg: 'whiteAlpha.100', color: 'white' }} />
                        </Tooltip>
                        <Tooltip label="Download">
                          <IconButton icon={<FiDownload />} size="xs" variant="ghost" color="gray.500"
                            onClick={() => handleDownload(doc.id)} aria-label="Download"
                            _hover={{ bg: 'whiteAlpha.100', color: 'white' }} />
                        </Tooltip>
                        <Tooltip label="Rename">
                          <IconButton icon={<FiEdit2 />} size="xs" variant="ghost" color="gray.500"
                            onClick={() => handleRename(doc)} aria-label="Rename document"
                            _hover={{ bg: 'whiteAlpha.100', color: 'white' }} />
                        </Tooltip>
                        {canAddToGroup(doc) && (
                          <Tooltip label="Add to Group">
                            <IconButton icon={<FiUserPlus />} size="xs" variant="ghost" color="gray.500"
                              onClick={() => handleAddToGroupClick(doc)} aria-label="Add to group"
                              _hover={{ bg: 'whiteAlpha.100', color: 'white' }} />
                          </Tooltip>
                        )}
                        {canDelete(doc) && (
                          <Tooltip label="Delete">
                            <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" color="gray.500"
                              onClick={() => handleDeleteClick(doc.id, doc.filename)} aria-label="Delete document"
                              _hover={{ bg: 'whiteAlpha.100', color: 'red.400' }} />
                          </Tooltip>
                        )}
                      </HStack>
                      <Tooltip label="More actions">
                        <IconButton icon={<FiMoreVertical />} size="xs" variant="ghost" color="gray.500"
                          onClick={(e) => handleMoreActionsClick(e, doc)} aria-label="More actions"
                          _hover={{ bg: 'whiteAlpha.100', color: 'white' }} />
                      </Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>

      {SharedOverlays()}
    </>
  );
};

export default DocumentList;
