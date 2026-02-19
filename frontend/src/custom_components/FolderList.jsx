import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiFolder,
  FiEdit2,
  FiTrash2,
  FiChevronRight,
  FiGlobe,
  FiUsers,
  FiDownload,
  FiMoreVertical,
} from 'react-icons/fi';
import { foldersAPI } from '../utils/api';
import FolderContextMenu from './FolderContextMenu';
import DownloadStatusPanel from './DownloadStatusPanel';

const FolderList = ({ folders = [], onNavigate, onRefresh, onRenameFolder, allFolders = [], groups = [], onMoveFolder, onAddFolderToGroup }) => {
  const [dragOverId, setDragOverId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, folder: null });
  const [renameFolder, setRenameFolder] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [folderDownloads, setFolderDownloads] = useState([]);
  const toast = useToast();
  const scrollContainerRef = useRef(null);
  const cancelRef = useRef();

  const { isOpen: isRenameOpen, onOpen: onRenameOpen, onClose: onRenameClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const handleWheel = useCallback((e) => {
    const container = scrollContainerRef.current;
    if (container) {
      e.preventDefault();
      e.stopPropagation();
      container.scrollLeft += (e.deltaY > 0 ? 1 : -1) * 30;
    }
  }, []);

  const handleContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, position: { x: e.clientX, y: e.clientY }, folder });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleRenameOpen = (folder) => {
    setRenameFolder(folder);
    setRenameValue(folder.name);
    onRenameOpen();
  };

  const handleRenameConfirm = async () => {
    if (!renameValue.trim() || !renameFolder) return;
    try {
      await foldersAPI.update(renameFolder.id, { name: renameValue.trim() });
      const updatedFolder = { ...renameFolder, name: renameValue.trim() };
      if (onRenameFolder) onRenameFolder(updatedFolder);
      toast({ title: 'Folder renamed', status: 'success', duration: 3000, isClosable: true });
    } catch (error) {
      toast({ title: 'Rename failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    } finally {
      onRenameClose();
      setRenameFolder(null);
      setRenameValue('');
    }
  };

  const handleDeleteOpen = (folder) => {
    setDeleteId(folder.id);
    setDeleteName(folder.name);
    onDeleteOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await foldersAPI.delete(deleteId);
      toast({ title: 'Folder deleted', status: 'success', duration: 3000, isClosable: true });
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: 'Delete failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    } finally {
      onDeleteClose();
      setDeleteId(null);
      setDeleteName('');
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

  const handleMoreActionsClick = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ visible: true, position: { x: rect.left, y: rect.bottom + 4 }, folder });
  };

  const handleMoveFolder = async (folderId, targetParentId) => {
    try {
      await foldersAPI.move(folderId, targetParentId);
      toast({ title: 'Folder moved', status: 'success', duration: 3000, isClosable: true });
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: 'Move failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleAddFolderToGroup = async (folder, groupId) => {
    try {
      await foldersAPI.update(folder.id, { group_id: groupId });
      toast({ title: 'Folder added to group', status: 'success', duration: 3000, isClosable: true });
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: 'Failed to add to group', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    }
  };

  if (!folders || folders.length === 0) return null;

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(folderId);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = async (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    const documentId = e.dataTransfer.getData('documentId');
    if (!documentId) return;
    try {
      await foldersAPI.moveDocument(parseInt(documentId), folderId);
      toast({ title: 'Document moved', status: 'success', duration: 3000, isClosable: true });
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: 'Move failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    }
  };

  return (
    <>
      <Box
        ref={scrollContainerRef}
        mb={4}
        overflowX="auto"
        pb={2}
        onWheel={handleWheel}
        sx={{
          overscrollBehavior: 'none',
          '&::-webkit-scrollbar': { height: '6px' },
          '&::-webkit-scrollbar-track': { bg: 'transparent' },
          '&::-webkit-scrollbar-thumb': { bg: 'primary.600', borderRadius: '3px' },
          '&::-webkit-scrollbar-thumb:hover': { bg: 'primary.500' },
          scrollbarWidth: 'thin',
          scrollbarColor: '#3d4148 transparent',
        }}
      >
        <HStack spacing={3} minW="max-content">
          {folders.map((folder) => {
            const isHovered = hoveredId === folder.id;
            return (
              <Box
                key={folder.id}
                p={3}
                border="1px"
                borderColor={dragOverId === folder.id ? 'accent.500' : 'whiteAlpha.100'}
                borderRadius="md"
                transition="all 0.15s"
                cursor="pointer"
                bg={dragOverId === folder.id ? 'whiteAlpha.100' : 'transparent'}
                onClick={() => onNavigate(folder.id)}
                onContextMenu={(e) => handleContextMenu(e, folder)}
                onMouseEnter={() => setHoveredId(folder.id)}
                onMouseLeave={() => setHoveredId(null)}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder.id)}
                _hover={{ bg: 'whiteAlpha.50', borderColor: 'whiteAlpha.200' }}
                minW="160px"
                maxW="220px"
                flexShrink={0}
              >
                <HStack spacing={2} w="100%">
                  <Icon as={FiFolder} boxSize={5} color="accent.400" flexShrink={0} />
                  <VStack align="start" spacing={0} flex={1} minW={0} w="100%">
                    <HStack spacing={1} w="100%">
                      <Text color="white" fontSize="sm" fontWeight="medium" noOfLines={1} flex={1} title={folder.name}>
                        {folder.name}
                      </Text>
                      <IconButton
                        icon={<FiMoreVertical />}
                        size="xs"
                        variant="ghost"
                        color="gray.500"
                        onClick={(e) => handleMoreActionsClick(e, folder)}
                        aria-label="More actions"
                        opacity={isHovered ? 1 : 0}
                        transition="opacity 0.15s"
                        _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                        flexShrink={0}
                      />
                    </HStack>
                    <HStack spacing={1} w="100%">
                      <Text color="gray.500" fontSize="xs" noOfLines={1}>
                        {folder.document_count || 0} file{folder.document_count !== 1 ? 's' : ''}
                        {folder.subfolder_count > 0 && ` · ${folder.subfolder_count} folder${folder.subfolder_count !== 1 ? 's' : ''}`}
                      </Text>
                      {folder.scope === 'organization' && (
                        <Icon as={folder.group_id ? FiUsers : FiGlobe} boxSize={3} color={folder.group_id ? 'purple.400' : 'blue.400'} flexShrink={0} />
                      )}
                    </HStack>
                  </VStack>
                </HStack>
              </Box>
            );
          })}
        </HStack>
      </Box>

      {/* Folder Context Menu */}
      <FolderContextMenu
        position={contextMenu.position}
        folder={contextMenu.folder}
        isVisible={contextMenu.visible}
        onClose={closeContextMenu}
        onOpen={(folderId) => { onNavigate(folderId); }}
        onDownload={handleFolderDownload}
        onRename={(f) => handleRenameOpen(f)}
        onDelete={(f) => handleDeleteOpen(f)}
        onMoveToFolder={onMoveFolder || handleMoveFolder}
        onAddToGroup={onAddFolderToGroup || handleAddFolderToGroup}
        folders={allFolders.length > 0 ? allFolders : folders}
        groups={groups}
      />

      {/* Rename Modal */}
      <Modal isOpen={isRenameOpen} onClose={onRenameClose} isCentered>
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <ModalContent bg="primary.800" border="1px" borderColor="primary.600">
          <ModalHeader color="white">Rename Folder</ModalHeader>
          <ModalBody>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Folder name"
              color="white"
              _placeholder={{ color: 'gray.500' }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfirm(); }}
              autoFocus
            />
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" color="gray.400" onClick={onRenameClose}>Cancel</Button>
            <Button bg="accent.500" color="white" onClick={handleRenameConfirm} isDisabled={!renameValue.trim()}>Rename</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Alert Dialog */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose} isCentered>
        <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <AlertDialogContent bg="primary.800" border="1px" borderColor="primary.600">
          <AlertDialogHeader color="white" fontSize="lg" fontWeight="bold">Delete Folder</AlertDialogHeader>
          <AlertDialogBody color="gray.300">
            Are you sure you want to delete "{deleteName}"? This action cannot be undone.
          </AlertDialogBody>
          <AlertDialogFooter gap={3}>
            <Button ref={cancelRef} variant="ghost" color="gray.400" onClick={onDeleteClose}>Cancel</Button>
            <Button bg="red.600" color="white" onClick={handleDeleteConfirm}>Delete</Button>
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
};

export default FolderList;
