import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
} from '@chakra-ui/react';
import { FiFolder, FiEdit2, FiTrash2, FiChevronRight, FiGlobe, FiUsers } from 'react-icons/fi';
import { foldersAPI } from '../utils/api';

const FolderList = ({ folders = [], onNavigate, onRefresh, onRenameFolder }) => {
  const [dragOverId, setDragOverId] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, folder: null });
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [renameFolder, setRenameFolder] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const toast = useToast();
  const scrollContainerRef = useRef(null);
  const menuRef = useRef(null);
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

  // Calculate menu position and close on click outside/scroll
  useEffect(() => {
    if (contextMenu.visible && contextMenu.position) {
      const menuWidth = 150;
      const menuHeight = 180;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = contextMenu.position.x;
      let y = contextMenu.position.y;

      if (x + menuWidth > viewportWidth - 10) {
        x = viewportWidth - menuWidth - 10;
      }
      if (y + menuHeight > viewportHeight - 10) {
        y = viewportHeight - menuHeight - 10;
      }
      if (x < 10) x = 10;
      if (y < 10) y = 10;

      setMenuPos({ x, y });
    }
  }, [contextMenu.visible, contextMenu.position]);

  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu({ visible: false, position: null, folder: null });
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setContextMenu({ visible: false, position: null, folder: null });
      }
    };

    const handleScroll = () => {
      setContextMenu({ visible: false, position: null, folder: null });
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenu.visible]);

  const handleContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: false, position: null, folder: null });
    requestAnimationFrame(() => {
      setContextMenu({
        visible: true,
        position: { x: e.clientX, y: e.clientY },
        folder,
      });
    });
  };

  const handleRenameClick = () => {
    if (contextMenu.folder) {
      setRenameFolder(contextMenu.folder);
      setRenameValue(contextMenu.folder.name);
      onRenameOpen();
    }
  };

  const handleRenameConfirm = async () => {
    if (!renameValue.trim() || !renameFolder) return;

    try {
      await foldersAPI.update(renameFolder.id, { name: renameValue.trim() });
      
      // Update folder in local state (preserves order and position)
      const updatedFolder = { ...renameFolder, name: renameValue.trim() };
      if (onRenameFolder) {
        onRenameFolder(updatedFolder);
      }
      
      toast({
        title: 'Folder renamed',
        description: 'Folder has been renamed successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Rename failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      onRenameClose();
      setRenameFolder(null);
      setRenameValue('');
    }
  };

  const handleDeleteClick = () => {
    if (contextMenu.folder) {
      setDeleteId(contextMenu.folder.id);
      setDeleteName(contextMenu.folder.name);
      onDeleteOpen();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      await foldersAPI.delete(deleteId);
      toast({
        title: 'Folder deleted',
        description: 'Folder has been deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      onDeleteClose();
      setDeleteId(null);
      setDeleteName('');
    }
  };

  if (!folders || folders.length === 0) return null;

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);

    const documentId = e.dataTransfer.getData('documentId');
    if (!documentId) return;

    try {
      await foldersAPI.moveDocument(parseInt(documentId), folderId);
      toast({
        title: 'Document moved',
        description: 'Document has been moved to the folder',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({
        title: 'Move failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
        {folders.map((folder) => (
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
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
            _hover={{
              bg: 'whiteAlpha.50',
              borderColor: 'whiteAlpha.200',
            }}
            minW="160px"
            maxW="220px"
            flexShrink={0}
          >
            <HStack spacing={2} w="100%">
              <Icon as={FiFolder} boxSize={5} color="accent.400" flexShrink={0} />
              <VStack align="start" spacing={0} flex={1} minW={0} w="100%">
                <Text
                  color="white"
                  fontSize="sm"
                  fontWeight="medium"
                  noOfLines={1}
                  w="100%"
                  title={folder.name}
                >
                  {folder.name}
                </Text>
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
        ))}
      </HStack>
      </Box>

    {/* Context Menu */}
    {contextMenu.visible && contextMenu.folder && createPortal(
      <Box
        ref={menuRef}
        position="fixed"
        left={`${menuPos.x}px`}
        top={`${menuPos.y}px`}
        bg="primary.800"
        border="1px"
        borderColor="primary.600"
        boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
        zIndex={10000}
        borderRadius="md"
        py={1}
        px={1}
        minW="150px"
        onContextMenu={(e) => e.preventDefault()}
      >
        <VStack spacing={0} align="stretch">
          <HStack
            px={3}
            py={2}
            cursor="pointer"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(contextMenu.folder.id);
              setContextMenu({ visible: false, position: null, folder: null });
            }}
            w="100%"
            borderRadius="md"
            _hover={{ bg: 'primary.700' }}
            spacing={2}
          >
            <Icon as={FiChevronRight} boxSize={4} color="gray.400" />
            <Text fontSize="sm" color="gray.200">
              Open
            </Text>
          </HStack>
          <HStack
            px={3}
            py={2}
            cursor="pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleRenameClick();
              setContextMenu({ visible: false, position: null, folder: null });
            }}
            w="100%"
            borderRadius="md"
            _hover={{ bg: 'primary.700' }}
            spacing={2}
          >
            <Icon as={FiEdit2} boxSize={4} color="gray.400" />
            <Text fontSize="sm" color="gray.200">
              Rename
            </Text>
          </HStack>
          <HStack
            px={3}
            py={2}
            cursor="pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick();
              setContextMenu({ visible: false, position: null, folder: null });
            }}
            w="100%"
            borderRadius="md"
            _hover={{ bg: 'red.900' }}
            spacing={2}
          >
            <Icon as={FiTrash2} boxSize={4} color="red.400" />
            <Text fontSize="sm" color="red.400">
              Delete
            </Text>
          </HStack>
        </VStack>
      </Box>,
      document.body
    )}

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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRenameConfirm();
              }
            }}
            autoFocus
          />
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" color="gray.400" onClick={onRenameClose}>
            Cancel
          </Button>
          <Button bg="accent.500" color="white" onClick={handleRenameConfirm} isDisabled={!renameValue.trim()}>
            Rename
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {/* Delete Alert Dialog */}
    <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose} isCentered>
      <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <AlertDialogContent bg="primary.800" border="1px" borderColor="primary.600">
        <AlertDialogHeader color="white" fontSize="lg" fontWeight="bold">
          Delete Folder
        </AlertDialogHeader>
        <AlertDialogBody color="gray.300">
          Are you sure you want to delete "{deleteName}"? This action cannot be undone.
        </AlertDialogBody>
        <AlertDialogFooter gap={3}>
          <Button ref={cancelRef} variant="ghost" color="gray.400" onClick={onDeleteClose}>
            Cancel
          </Button>
          <Button bg="red.600" color="white" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>);
};

export default FolderList;
