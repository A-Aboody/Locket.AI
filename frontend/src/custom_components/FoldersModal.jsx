import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  VStack,
  HStack,
  Text,
  Icon,
  Box,
  Button,
  Spinner,
  Center,
  useToast,
  IconButton,
  Tooltip,
  useDisclosure,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Input,
  InputGroup,
  InputLeftElement,
  Divider,
  Badge,
} from '@chakra-ui/react';
import {
  FiFolder,
  FiChevronRight,
  FiPlus,
  FiArrowLeft,
  FiSearch,
  FiFile,
  FiFileText,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiGlobe,
  FiUsers,
  FiEye,
  FiDownload,
  FiCopy,
} from 'react-icons/fi';
import { foldersAPI, documentsAPI } from '../utils/api';
import { formatFileSize, formatDate } from '../utils/formatters';
import CreateFolderModal from './CreateFolderModal';
import ContextMenu from './ContextMenu';

const FoldersModal = ({ isOpen, onClose, onSelectFolder, mode, selectionMode = false, onViewDocument }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allFolders, setAllFolders] = useState([]);
  const [folderDocuments, setFolderDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [currentFolderData, setCurrentFolderData] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, folder: null });
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [renameFolder, setRenameFolder] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteFolderState, setDeleteFolderState] = useState(null);
  const [docContextMenu, setDocContextMenu] = useState({ visible: false, position: null, document: null });

  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isRenameOpen, onOpen: onRenameOpen, onClose: onRenameClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentFolderId(null);
      setBreadcrumb([]);
      setSearchQuery('');
      setDebouncedQuery('');
      setFolderDocuments([]);
      setContextMenu({ visible: false, position: null, folder: null });
      setDocContextMenu({ visible: false, position: null, document: null });
      setCurrentFolderData(null);
      fetchFolders(null);
      fetchAllFoldersForSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Fetch folders when navigating
  useEffect(() => {
    if (isOpen) {
      fetchFolders(currentFolderId);
      if (currentFolderId) {
        fetchFolderDocuments(currentFolderId);
      } else {
        setFolderDocuments([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, isOpen]);

  const fetchAllFoldersForSearch = async () => {
    try {
      const response = await foldersAPI.list({ mode: mode || undefined });
      setAllFolders(response.data);
    } catch {
      setAllFolders([]);
    }
  };

  const fetchFolders = async (folderId) => {
    setLoading(true);
    try {
      const params = { mode: mode || undefined };
      if (folderId !== null) params.parent_id = folderId;
      const response = await foldersAPI.list(params);
      const sortedFolders = [...response.data].sort((a, b) => a.id - b.id);
      setFolders(sortedFolders);

      if (folderId) {
        const folderResponse = await foldersAPI.get(folderId);
        setBreadcrumb(folderResponse.data.breadcrumb || []);
        setCurrentFolderData(folderResponse.data);
      } else {
        setBreadcrumb([]);
        setCurrentFolderData(null);
      }
    } catch (error) {
      toast({
        title: 'Failed to load folders',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolderDocuments = async (folderId) => {
    setDocsLoading(true);
    try {
      const response = await documentsAPI.list({ folder_id: folderId });
      setFolderDocuments(response.data || []);
    } catch {
      setFolderDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleNavigate = (folderId) => {
    setSearchQuery('');
    setDebouncedQuery('');
    setCurrentFolderId(folderId);
  };

  const handleSelectFolder = (folderId, folderName, folderData) => {
    if (onSelectFolder) onSelectFolder(folderId, folderName, folderData);
    handleClose();
  };

  const handleCreateSuccess = () => {
    fetchFolders(currentFolderId);
    fetchAllFoldersForSearch();
    onCreateClose();
  };

  const handleClose = () => {
    setCurrentFolderId(null);
    setBreadcrumb([]);
    setSearchQuery('');
    setDebouncedQuery('');
    setFolderDocuments([]);
    onClose();
  };

  // Context menu positioning
  useEffect(() => {
    if (contextMenu.visible && contextMenu.position) {
      const menuWidth = 160;
      const menuHeight = 140;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = contextMenu.position.x;
      let y = contextMenu.position.y;
      if (x + menuWidth > vw - 10) x = vw - menuWidth - 10;
      if (y + menuHeight > vh - 10) y = vh - menuHeight - 10;
      if (x < 10) x = 10;
      if (y < 10) y = 10;
      setMenuPos({ x, y });
    }
  }, [contextMenu.visible, contextMenu.position]);

  useEffect(() => {
    if (!contextMenu.visible) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setContextMenu({ visible: false, position: null, folder: null });
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setContextMenu({ visible: false, position: null, folder: null });
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu.visible]);

  const handleContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setDocContextMenu({ visible: false, position: null, document: null });
    setContextMenu({ visible: false, position: null, folder: null });
    requestAnimationFrame(() => {
      setContextMenu({ visible: true, position: { x: e.clientX, y: e.clientY }, folder });
    });
  };

  const handleRenameClick = () => {
    if (contextMenu.folder) {
      setRenameFolder(contextMenu.folder);
      setRenameValue(contextMenu.folder.name);
      setContextMenu({ visible: false, position: null, folder: null });
      onRenameOpen();
    }
  };

  const handleRenameConfirm = async () => {
    if (!renameValue.trim() || !renameFolder) return;
    try {
      await foldersAPI.update(renameFolder.id, { name: renameValue.trim() });
      toast({ title: 'Folder renamed', status: 'success', duration: 3000, isClosable: true });
      fetchFolders(currentFolderId);
      fetchAllFoldersForSearch();
    } catch (error) {
      toast({ title: 'Rename failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    } finally {
      onRenameClose();
      setRenameFolder(null);
      setRenameValue('');
    }
  };

  const handleDeleteClick = () => {
    if (contextMenu.folder) {
      setDeleteFolderState(contextMenu.folder);
      setContextMenu({ visible: false, position: null, folder: null });
      onDeleteOpen();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteFolderState) return;
    try {
      await foldersAPI.delete(deleteFolderState.id);
      toast({ title: 'Folder deleted', status: 'success', duration: 3000, isClosable: true });
      fetchFolders(currentFolderId);
      fetchAllFoldersForSearch();
    } catch (error) {
      toast({ title: 'Delete failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    } finally {
      onDeleteClose();
      setDeleteFolderState(null);
    }
  };

  const handleOpenClick = () => {
    if (contextMenu.folder) {
      handleNavigate(contextMenu.folder.id);
      setContextMenu({ visible: false, position: null, folder: null });
    }
  };

  // Document context menu handlers
  const handleDocContextMenu = (e, doc) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: false, position: null, folder: null });
    setDocContextMenu({ visible: false, position: null, document: null });
    requestAnimationFrame(() => {
      setDocContextMenu({ visible: true, position: { x: e.clientX, y: e.clientY }, document: doc });
    });
  };

  const handleDocView = (docId) => {
    if (onViewDocument) {
      onViewDocument(docId);
    }
  };

  const handleDocDownload = async (docId) => {
    try {
      const doc = folderDocuments.find(d => d.id === docId);
      const response = await documentsAPI.downloadFile(docId);
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
      toast({ title: 'Download failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleDocRename = async (doc) => {
    const newName = prompt('Rename document:', doc.filename);
    if (newName && newName.trim() && newName.trim() !== doc.filename) {
      try {
        await documentsAPI.rename(doc.id, newName.trim());
        toast({ title: 'Document renamed', status: 'success', duration: 3000, isClosable: true });
        fetchFolderDocuments(currentFolderId);
      } catch (error) {
        toast({ title: 'Rename failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
      }
    }
  };

  const handleDocDelete = async (docId, filename) => {
    try {
      await documentsAPI.delete(docId);
      toast({ title: `"${filename}" moved to trash`, status: 'success', duration: 3000, isClosable: true });
      fetchFolderDocuments(currentFolderId);
      fetchFolders(currentFolderId);
    } catch (error) {
      toast({ title: 'Delete failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleDocMoveToFolder = async (docId, targetFolderId) => {
    try {
      await foldersAPI.moveDocument(docId, targetFolderId);
      toast({ title: 'Document moved', status: 'success', duration: 3000, isClosable: true });
      fetchFolderDocuments(currentFolderId);
      fetchFolders(currentFolderId);
    } catch (error) {
      toast({ title: 'Move failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleDocCopy = async (docId) => {
    try {
      await documentsAPI.copy(docId);
      toast({ title: 'Document copied', status: 'success', duration: 3000, isClosable: true });
      fetchFolderDocuments(currentFolderId);
    } catch (error) {
      toast({ title: 'Copy failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    }
  };

  // Filter folders based on search
  const displayFolders = debouncedQuery.trim()
    ? allFolders.filter((f) => f.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : folders;

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    if (ext === 'pdf') return { icon: FiFileText, color: 'red.400' };
    if (ext === 'doc' || ext === 'docx') return { icon: FiFileText, color: 'blue.400' };
    if (ext === 'txt') return { icon: FiFileText, color: 'gray.400' };
    return { icon: FiFile, color: 'accent.400' };
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size="3xl" isCentered>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(8px)" />
        <ModalContent
          bg="primary.800"
          border="1px"
          borderColor="primary.600"
          maxH="85vh"
          minH="60vh"
          borderRadius="xl"
          overflow="hidden"
        >
          {/* Header */}
          <Box px={6} pt={5} pb={4} borderBottom="1px" borderColor="primary.600">
            <HStack justify="space-between" mb={4}>
              <HStack spacing={3}>
                {currentFolderId && !debouncedQuery.trim() && (
                  <IconButton
                    icon={<FiArrowLeft />}
                    size="sm"
                    variant="ghost"
                    color="gray.400"
                    onClick={() => {
                      if (breadcrumb.length > 1) {
                        handleNavigate(breadcrumb[breadcrumb.length - 2].id);
                      } else {
                        handleNavigate(null);
                      }
                    }}
                    aria-label="Go back"
                    _hover={{ color: 'white', bg: 'primary.700' }}
                    borderRadius="lg"
                  />
                )}
                <Text fontSize="lg" fontWeight="600" color="white" letterSpacing="-0.01em">
                  Folders
                </Text>
                {currentFolderId && !debouncedQuery.trim() && (
                  <Badge
                    bg="primary.700"
                    color="gray.400"
                    fontSize="xs"
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    fontWeight="500"
                  >
                    {folders.length} folder{folders.length !== 1 ? 's' : ''}
                    {folderDocuments.length > 0 && ` · ${folderDocuments.length} file${folderDocuments.length !== 1 ? 's' : ''}`}
                  </Badge>
                )}
              </HStack>
              <HStack spacing={2}>
                <Tooltip label="New folder">
                  <IconButton
                    icon={<FiPlus />}
                    size="sm"
                    variant="ghost"
                    color="gray.400"
                    onClick={onCreateOpen}
                    aria-label="New folder"
                    _hover={{ color: 'white', bg: 'primary.700' }}
                    borderRadius="lg"
                  />
                </Tooltip>
                <IconButton
                  icon={<FiX />}
                  size="sm"
                  variant="ghost"
                  color="gray.500"
                  onClick={handleClose}
                  aria-label="Close"
                  _hover={{ color: 'white', bg: 'primary.700' }}
                  borderRadius="lg"
                />
              </HStack>
            </HStack>

            {/* Search */}
            <InputGroup size="sm">
              <InputLeftElement pointerEvents="none">
                <FiSearch color="var(--chakra-colors-gray-500)" />
              </InputLeftElement>
              <Input
                ref={searchInputRef}
                placeholder="Search folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="primary.700"
                border="1px"
                borderColor="primary.600"
                borderRadius="lg"
                color="white"
                _placeholder={{ color: 'gray.500' }}
                _focus={{ borderColor: 'accent.500', boxShadow: 'none' }}
                _hover={{ borderColor: 'primary.500' }}
                pr={searchQuery ? '32px' : undefined}
              />
              {searchQuery && (
                <Box position="absolute" right={2} top="50%" transform="translateY(-50%)" zIndex={2}>
                  <IconButton
                    icon={<FiX />}
                    size="xs"
                    variant="ghost"
                    color="gray.500"
                    onClick={() => { setSearchQuery(''); setDebouncedQuery(''); }}
                    aria-label="Clear search"
                    _hover={{ color: 'white' }}
                    minW="auto"
                    h="auto"
                    p={1}
                  />
                </Box>
              )}
            </InputGroup>

            {/* Breadcrumb */}
            {currentFolderId && !debouncedQuery.trim() && breadcrumb.length > 0 && (
              <Box mt={3}>
                <Breadcrumb
                  separator={<FiChevronRight color="var(--chakra-colors-gray-600)" size={12} />}
                  fontSize="xs"
                >
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      color="gray.500"
                      onClick={() => handleNavigate(null)}
                      _hover={{ color: 'accent.400' }}
                    >
                      All Folders
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {breadcrumb.map((item, idx) => (
                    <BreadcrumbItem key={item.id} isCurrentPage={idx === breadcrumb.length - 1}>
                      <BreadcrumbLink
                        color={idx === breadcrumb.length - 1 ? 'white' : 'gray.500'}
                        onClick={() => handleNavigate(item.id)}
                        _hover={{ color: 'accent.400' }}
                        fontWeight={idx === breadcrumb.length - 1 ? '500' : 'normal'}
                      >
                        {item.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  ))}
                </Breadcrumb>
              </Box>
            )}
          </Box>

          {/* Body */}
          <ModalBody p={0} overflowY="auto" flex={1}>
            {loading ? (
              <Center py={16}>
                <VStack spacing={3}>
                  <Spinner size="lg" color="accent.500" thickness="3px" />
                  <Text color="gray.500" fontSize="sm">Loading folders...</Text>
                </VStack>
              </Center>
            ) : debouncedQuery.trim() && displayFolders.length === 0 ? (
              <Center py={16}>
                <VStack spacing={3}>
                  <Box p={4} bg="primary.700" rounded="full">
                    <FiSearch size={28} color="var(--chakra-colors-gray-600)" />
                  </Box>
                  <Text color="gray.400" fontSize="sm">
                    No folders matching &ldquo;{debouncedQuery}&rdquo;
                  </Text>
                </VStack>
              </Center>
            ) : !debouncedQuery.trim() && displayFolders.length === 0 && folderDocuments.length === 0 ? (
              <Center py={16}>
                <VStack spacing={3}>
                  <Box p={4} bg="primary.700" rounded="full" border="2px dashed" borderColor="primary.600">
                    <FiFolder size={28} color="var(--chakra-colors-gray-600)" />
                  </Box>
                  <Text color="gray.400" fontSize="sm">
                    {currentFolderId ? 'This folder is empty' : 'No folders yet'}
                  </Text>
                  <Text color="gray.600" fontSize="xs">
                    {currentFolderId ? 'Add subfolders or move documents here' : 'Create a folder to organize your documents'}
                  </Text>
                </VStack>
              </Center>
            ) : (
              <Box px={4} py={3}>
                {/* Folders */}
                {displayFolders.length > 0 && (
                  <VStack spacing={1} align="stretch" mb={folderDocuments.length > 0 ? 2 : 0}>
                    {!debouncedQuery.trim() && (
                      <Text fontSize="xs" color="gray.500" fontWeight="500" px={2} mb={1} textTransform="uppercase" letterSpacing="0.05em">
                        Folders
                      </Text>
                    )}
                    {displayFolders.map((folder) => (
                      <HStack
                        key={folder.id}
                        px={3}
                        py={2.5}
                        borderRadius="lg"
                        cursor="pointer"
                        onClick={() => handleNavigate(folder.id)}
                        onDoubleClick={() => handleSelectFolder(folder.id, folder.name, folder)}
                        onContextMenu={(e) => handleContextMenu(e, folder)}
                        _hover={{ bg: 'whiteAlpha.50' }}
                        transition="all 0.1s"
                        spacing={3}
                        role="group"
                      >
                        <Box
                          p={2}
                          bg="primary.700"
                          borderRadius="lg"
                          _groupHover={{ bg: 'accent.500' }}
                          transition="all 0.15s"
                          flexShrink={0}
                        >
                          <Icon as={FiFolder} boxSize={4} color="accent.400" _groupHover={{ color: 'white' }} transition="color 0.15s" />
                        </Box>
                        <VStack align="start" spacing={0} flex={1} minW={0}>
                          <HStack spacing={2} w="100%">
                            <Text color="white" fontSize="sm" fontWeight="500" noOfLines={1} flex={1} minW={0}>
                              {folder.name}
                            </Text>
                            {folder.scope === 'organization' && (
                              <HStack spacing={1} flexShrink={0}>
                                <Icon as={folder.group_id ? FiUsers : FiGlobe} boxSize={3} color={folder.group_id ? 'purple.400' : 'blue.400'} />
                                <Text fontSize="xs" color={folder.group_id ? 'purple.400' : 'blue.400'}>
                                  {folder.group_name || 'Org'}
                                </Text>
                              </HStack>
                            )}
                          </HStack>
                          <Text color="gray.500" fontSize="xs" noOfLines={1} w="100%">
                            {folder.document_count || 0} file{folder.document_count !== 1 ? 's' : ''}
                            {folder.subfolder_count > 0 && ` · ${folder.subfolder_count} subfolder${folder.subfolder_count !== 1 ? 's' : ''}`}
                          </Text>
                        </VStack>
                        {selectionMode && (
                          <Button
                            size="xs"
                            variant="ghost"
                            color="gray.500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectFolder(folder.id, folder.name, folder);
                            }}
                            _hover={{ color: 'white', bg: 'accent.500' }}
                            _groupHover={{ opacity: 1 }}
                            opacity={0}
                            transition="all 0.15s"
                            borderRadius="md"
                            flexShrink={0}
                          >
                            Select
                          </Button>
                        )}
                        <Icon as={FiChevronRight} boxSize={4} color="gray.600" _groupHover={{ color: 'gray.400' }} flexShrink={0} transition="color 0.15s" />
                      </HStack>
                    ))}
                  </VStack>
                )}

                {/* Documents in current folder */}
                {currentFolderId && !debouncedQuery.trim() && (
                  <>
                    {displayFolders.length > 0 && folderDocuments.length > 0 && (
                      <Divider borderColor="primary.600" my={2} />
                    )}
                    {docsLoading ? (
                      <Center py={6}>
                        <Spinner size="sm" color="accent.500" thickness="2px" />
                      </Center>
                    ) : folderDocuments.length > 0 ? (
                      <VStack spacing={1} align="stretch">
                        <Text fontSize="xs" color="gray.500" fontWeight="500" px={2} mb={1} textTransform="uppercase" letterSpacing="0.05em">
                          Files
                        </Text>
                        {folderDocuments.map((doc) => {
                          const fileIcon = getFileIcon(doc.filename);
                          return (
                            <HStack
                              key={doc.id}
                              px={3}
                              py={2.5}
                              borderRadius="lg"
                              cursor="default"
                              onContextMenu={(e) => handleDocContextMenu(e, doc)}
                              _hover={{ bg: 'whiteAlpha.50' }}
                              transition="all 0.1s"
                              spacing={3}
                              role="group"
                            >
                              <Box p={2} bg="primary.700" borderRadius="lg" flexShrink={0}>
                                <Icon as={fileIcon.icon} boxSize={4} color={fileIcon.color} />
                              </Box>
                              <VStack align="start" spacing={0} flex={1} minW={0}>
                                <Text color="white" fontSize="sm" fontWeight="500" noOfLines={1} w="100%">
                                  {doc.filename}
                                </Text>
                                <HStack spacing={2} fontSize="xs" color="gray.500">
                                  <Text>{doc.filename.split('.').pop().toUpperCase()}</Text>
                                  {doc.file_size && (
                                    <>
                                      <Text>·</Text>
                                      <Text>{formatFileSize(doc.file_size)}</Text>
                                    </>
                                  )}
                                  {doc.uploaded_at && (
                                    <>
                                      <Text>·</Text>
                                      <Text>{formatDate(doc.uploaded_at)}</Text>
                                    </>
                                  )}
                                </HStack>
                              </VStack>
                              <HStack
                                spacing={0}
                                flexShrink={0}
                                opacity={0}
                                _groupHover={{ opacity: 1 }}
                                transition="opacity 0.15s"
                              >
                                {onViewDocument && (
                                  <Tooltip label="View" placement="top" hasArrow>
                                    <IconButton
                                      icon={<FiEye />}
                                      size="xs"
                                      variant="ghost"
                                      color="gray.400"
                                      aria-label="View document"
                                      onClick={() => handleDocView(doc.id)}
                                      _hover={{ color: 'white', bg: 'primary.600' }}
                                      borderRadius="md"
                                    />
                                  </Tooltip>
                                )}
                                <Tooltip label="Download" placement="top" hasArrow>
                                  <IconButton
                                    icon={<FiDownload />}
                                    size="xs"
                                    variant="ghost"
                                    color="gray.400"
                                    aria-label="Download document"
                                    onClick={() => handleDocDownload(doc.id)}
                                    _hover={{ color: 'white', bg: 'primary.600' }}
                                    borderRadius="md"
                                  />
                                </Tooltip>
                                <Tooltip label="Rename" placement="top" hasArrow>
                                  <IconButton
                                    icon={<FiEdit2 />}
                                    size="xs"
                                    variant="ghost"
                                    color="gray.400"
                                    aria-label="Rename document"
                                    onClick={() => handleDocRename(doc)}
                                    _hover={{ color: 'white', bg: 'primary.600' }}
                                    borderRadius="md"
                                  />
                                </Tooltip>
                                <Tooltip label="Copy" placement="top" hasArrow>
                                  <IconButton
                                    icon={<FiCopy />}
                                    size="xs"
                                    variant="ghost"
                                    color="gray.400"
                                    aria-label="Copy document"
                                    onClick={() => handleDocCopy(doc.id)}
                                    _hover={{ color: 'white', bg: 'primary.600' }}
                                    borderRadius="md"
                                  />
                                </Tooltip>
                                <Tooltip label="Trash" placement="top" hasArrow>
                                  <IconButton
                                    icon={<FiTrash2 />}
                                    size="xs"
                                    variant="ghost"
                                    color="gray.400"
                                    aria-label="Move to trash"
                                    onClick={() => handleDocDelete(doc.id, doc.filename)}
                                    _hover={{ color: 'red.400', bg: 'red.900' }}
                                    borderRadius="md"
                                  />
                                </Tooltip>
                              </HStack>
                            </HStack>
                          );
                        })}
                      </VStack>
                    ) : null}
                  </>
                )}
              </Box>
            )}
          </ModalBody>

          {/* Footer with select button when inside a folder (only in selection mode, e.g. upload) */}
          {currentFolderId && !debouncedQuery.trim() && selectionMode && onSelectFolder && (
            <ModalFooter
              borderTop="1px"
              borderColor="primary.600"
              bg="primary.800"
              px={6}
              py={3}
            >
              <HStack w="100%" justify="space-between">
                <HStack spacing={2} minW={0} flex={1}>
                  <Icon as={FiCheck} boxSize={4} color="accent.400" />
                  <Text fontSize="sm" color="gray.400" noOfLines={1}>
                    {breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : 'Current folder'}
                  </Text>
                </HStack>
                <Button
                  size="sm"
                  bg="accent.500"
                  color="white"
                  _hover={{ bg: 'accent.600' }}
                  onClick={() => {
                    const name = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : '';
                    handleSelectFolder(currentFolderId, name, currentFolderData);
                  }}
                  borderRadius="md"
                  fontWeight="500"
                  px={6}
                >
                  Select this folder
                </Button>
              </HStack>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>

      {/* Context Menu Portal */}
      {contextMenu.visible && contextMenu.folder && createPortal(
        <Box
          ref={menuRef}
          position="fixed"
          left={`${menuPos.x}px`}
          top={`${menuPos.y}px`}
          bg="primary.800"
          border="1px"
          borderColor="primary.600"
          boxShadow="0 8px 32px rgba(0, 0, 0, 0.5)"
          zIndex={100000}
          borderRadius="lg"
          py={1}
          px={1}
          minW="160px"
          onContextMenu={(e) => e.preventDefault()}
        >
          <VStack spacing={0} align="stretch">
            <HStack
              px={3}
              py={2}
              cursor="pointer"
              onClick={handleOpenClick}
              borderRadius="md"
              _hover={{ bg: 'primary.700' }}
              spacing={2}
            >
              <Icon as={FiChevronRight} boxSize={4} color="gray.400" />
              <Text fontSize="sm" color="gray.200">Open</Text>
            </HStack>
            <HStack
              px={3}
              py={2}
              cursor="pointer"
              onClick={handleRenameClick}
              borderRadius="md"
              _hover={{ bg: 'primary.700' }}
              spacing={2}
            >
              <Icon as={FiEdit2} boxSize={4} color="gray.400" />
              <Text fontSize="sm" color="gray.200">Rename</Text>
            </HStack>
            <HStack
              px={3}
              py={2}
              cursor="pointer"
              onClick={handleDeleteClick}
              borderRadius="md"
              _hover={{ bg: 'red.900' }}
              spacing={2}
            >
              <Icon as={FiTrash2} boxSize={4} color="red.400" />
              <Text fontSize="sm" color="red.400">Delete</Text>
            </HStack>
          </VStack>
        </Box>,
        document.body
      )}

      {/* Document Context Menu */}
      <ContextMenu
        position={docContextMenu.position}
        document={docContextMenu.document}
        isVisible={docContextMenu.visible}
        onClose={() => setDocContextMenu({ visible: false, position: null, document: null })}
        onView={handleDocView}
        onDownload={handleDocDownload}
        onRename={handleDocRename}
        onCopy={handleDocCopy}
        onDelete={handleDocDelete}
        onMoveToFolder={handleDocMoveToFolder}
        folders={folders}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        parentId={currentFolderId}
        onSuccess={handleCreateSuccess}
        inheritedScope={currentFolderData?.scope}
        inheritedGroupId={currentFolderData?.group_id}
        currentMode={mode}
      />

      {/* Rename Modal */}
      <Modal isOpen={isRenameOpen} onClose={onRenameClose} isCentered>
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <ModalContent bg="primary.800" border="1px" borderColor="primary.600" borderRadius="xl">
          <Box px={6} pt={5} pb={5}>
            <HStack spacing={3} mb={4}>
              <Box p={2} bg="accent.500" rounded="lg">
                <FiEdit2 size={16} color="white" />
              </Box>
              <Text fontSize="md" fontWeight="600" color="white">Rename Folder</Text>
            </HStack>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Folder name"
              color="white"
              bg="primary.700"
              border="1px"
              borderColor="primary.600"
              borderRadius="lg"
              _placeholder={{ color: 'gray.500' }}
              _focus={{ borderColor: 'accent.500', boxShadow: 'none' }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfirm(); }}
              autoFocus
            />
            <HStack justify="flex-end" mt={4} spacing={2}>
              <Box
                as="button"
                px={4}
                py={1.5}
                color="gray.400"
                borderRadius="lg"
                fontSize="sm"
                fontWeight="500"
                onClick={onRenameClose}
                _hover={{ bg: 'primary.700', color: 'white' }}
                transition="all 0.15s"
              >
                Cancel
              </Box>
              <Box
                as="button"
                px={4}
                py={1.5}
                bg="accent.500"
                color="white"
                borderRadius="lg"
                fontSize="sm"
                fontWeight="500"
                onClick={handleRenameConfirm}
                opacity={!renameValue.trim() ? 0.5 : 1}
                cursor={!renameValue.trim() ? 'not-allowed' : 'pointer'}
                _hover={{ bg: 'accent.600' }}
                transition="all 0.15s"
              >
                Rename
              </Box>
            </HStack>
          </Box>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered size="sm">
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <ModalContent bg="primary.800" border="1px" borderColor="primary.600" borderRadius="xl">
          <Box px={6} pt={5} pb={5}>
            <HStack spacing={3} mb={3}>
              <Box p={2} bg="red.600" rounded="lg">
                <FiTrash2 size={16} color="white" />
              </Box>
              <Text fontSize="md" fontWeight="600" color="white">Delete Folder</Text>
            </HStack>
            <Text color="gray.300" fontSize="sm" mb={1}>
              Are you sure you want to delete <Text as="span" fontWeight="600" color="white">&ldquo;{deleteFolderState?.name}&rdquo;</Text>?
            </Text>
            <Text color="gray.500" fontSize="xs" mb={4}>
              This action cannot be undone.
            </Text>
            <HStack justify="flex-end" spacing={2}>
              <Box
                as="button"
                px={4}
                py={1.5}
                color="gray.400"
                borderRadius="lg"
                fontSize="sm"
                fontWeight="500"
                onClick={onDeleteClose}
                _hover={{ bg: 'primary.700', color: 'white' }}
                transition="all 0.15s"
              >
                Cancel
              </Box>
              <Box
                as="button"
                px={4}
                py={1.5}
                bg="red.600"
                color="white"
                borderRadius="lg"
                fontSize="sm"
                fontWeight="500"
                onClick={handleDeleteConfirm}
                _hover={{ bg: 'red.700' }}
                transition="all 0.15s"
              >
                Delete
              </Box>
            </HStack>
          </Box>
        </ModalContent>
      </Modal>
    </>
  );
};

export default FoldersModal;
