import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  VStack,
  HStack,
  Text,
  Box,
  Icon,
  IconButton,
  Tooltip,
  Button,
  useToast,
  Spinner,
  Center,
  Collapse,
  Divider,
} from '@chakra-ui/react';
import {
  FiFolder,
  FiFile,
  FiFileText,
  FiChevronRight,
  FiChevronDown,
  FiEye,
  FiDownload,
  FiEdit2,
  FiCopy,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi';
import { userGroupsAPI, foldersAPI, documentsAPI, apiUtils } from '../../utils/api';
import { formatFileSize } from '../../utils/formatters';

const GroupFolders = ({ groupId, groupName, isOwner, currentUserId, onViewDocument }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderContents, setFolderContents] = useState({});
  const [loadingContents, setLoadingContents] = useState({});
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, doc: null, folderId: null });
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    fetchFolders();
  }, [groupId]);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await userGroupsAPI.getGroupFolders(groupId);
      setFolders(response.data || []);
    } catch (error) {
      console.error('Failed to fetch group folders:', error);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolderContents = async (folderId) => {
    if (folderContents[folderId]) return; // Already loaded
    
    setLoadingContents(prev => ({ ...prev, [folderId]: true }));
    try {
      // Fetch folder children and documents in parallel
      const [folderResponse, docsResponse] = await Promise.all([
        foldersAPI.get(folderId),
        documentsAPI.list({ folder_id: folderId, mode: 'organization' }),
      ]);
      const data = folderResponse.data;
      setFolderContents(prev => ({
        ...prev,
        [folderId]: {
          documents: docsResponse.data || [],
          children: data.children || [],
        }
      }));
    } catch (error) {
      console.error('Failed to fetch folder contents:', error);
      setFolderContents(prev => ({
        ...prev,
        [folderId]: { documents: [], children: [] }
      }));
    } finally {
      setLoadingContents(prev => ({ ...prev, [folderId]: false }));
    }
  };

  const toggleFolder = (folderId) => {
    const isExpanding = !expandedFolders[folderId];
    setExpandedFolders(prev => ({ ...prev, [folderId]: isExpanding }));
    if (isExpanding) {
      fetchFolderContents(folderId);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    if (ext === 'pdf') return { icon: FiFileText, color: 'red.400' };
    if (ext === 'doc' || ext === 'docx') return { icon: FiFileText, color: 'blue.400' };
    if (ext === 'txt') return { icon: FiFileText, color: 'gray.400' };
    return { icon: FiFile, color: 'accent.400' };
  };

  // Context menu handlers
  const handleContextMenu = (e, doc, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: false, position: null, doc: null, folderId: null });
    requestAnimationFrame(() => {
      setContextMenu({
        visible: true,
        position: { x: e.clientX, y: e.clientY },
        doc,
        folderId,
      });
    });
  };

  useEffect(() => {
    if (contextMenu.visible && contextMenu.position) {
      const menuWidth = 180;
      const menuHeight = 200;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = contextMenu.position.x;
      let y = contextMenu.position.y;

      if (x + menuWidth > viewportWidth - 10) x = viewportWidth - menuWidth - 10;
      if (y + menuHeight > viewportHeight - 10) y = viewportHeight - menuHeight - 10;
      if (x < 10) x = 10;
      if (y < 10) y = 10;

      setMenuPos({ x, y });
    }
  }, [contextMenu.visible, contextMenu.position]);

  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu({ visible: false, position: null, doc: null, folderId: null });
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setContextMenu({ visible: false, position: null, doc: null, folderId: null });
    };
    const handleScroll = () => setContextMenu({ visible: false, position: null, doc: null, folderId: null });

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenu.visible]);

  const handleView = (docId) => {
    setContextMenu({ visible: false, position: null, doc: null, folderId: null });
    if (onViewDocument) {
      onViewDocument(docId);
    }
  };

  const handleDownload = (docId) => {
    setContextMenu({ visible: false, position: null, doc: null, folderId: null });
    const url = documentsAPI.getFileUrl(docId);
    window.open(url, '_blank');
  };

  const handleCopy = async (docId) => {
    setContextMenu({ visible: false, position: null, doc: null, folderId: null });
    try {
      await documentsAPI.copy(docId);
      toast({
        title: 'Document copied',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Center py={4}>
        <Spinner size="sm" color="accent.500" thickness="2px" />
      </Center>
    );
  }

  if (folders.length === 0) {
    return (
      <Box
        p={4}
        bg="primary.700"
        rounded="lg"
        border="1px dashed"
        borderColor="primary.600"
        textAlign="center"
      >
        <Text color="gray.500" fontSize="sm">
          No folders in this group yet
        </Text>
      </Box>
    );
  }

  const renderDocumentItem = (doc, folderId) => {
    const fileIconData = getFileIcon(doc.filename);

    return (
      <Box
        key={doc.id}
        px={3}
        py={2}
        ml={4}
        bg="primary.700"
        rounded="md"
        border="1px"
        borderColor="primary.600"
        _hover={{ bg: 'primary.600', borderColor: 'primary.500' }}
        transition="all 0.15s"
        cursor="pointer"
        onClick={() => handleView(doc.id)}
        onContextMenu={(e) => handleContextMenu(e, doc, folderId)}
      >
        <HStack spacing={2}>
          <Icon as={fileIconData.icon} boxSize={4} color={fileIconData.color} flexShrink={0} />
          <VStack align="start" spacing={0} flex={1} minW={0}>
            <Text color="white" fontSize="xs" fontWeight="medium" noOfLines={1}>
              {doc.filename}
            </Text>
            <Text color="gray.500" fontSize="xs">
              {formatFileSize(doc.file_size)}
              {doc.uploaded_by_username && ` · ${doc.uploaded_by_username}`}
            </Text>
          </VStack>
          <HStack spacing={0.5}>
            <Tooltip label="View">
              <IconButton
                icon={<FiEye />}
                size="xs"
                variant="ghost"
                color="gray.500"
                onClick={(e) => { e.stopPropagation(); handleView(doc.id); }}
                aria-label="View"
                _hover={{ color: 'accent.400', bg: 'primary.600' }}
              />
            </Tooltip>
            <Tooltip label="Download">
              <IconButton
                icon={<FiDownload />}
                size="xs"
                variant="ghost"
                color="gray.500"
                onClick={(e) => { e.stopPropagation(); handleDownload(doc.id); }}
                aria-label="Download"
                _hover={{ color: 'white', bg: 'primary.600' }}
              />
            </Tooltip>
          </HStack>
        </HStack>
      </Box>
    );
  };

  const renderSubfolder = (subfolder) => {
    const isExpanded = expandedFolders[subfolder.id];
    const contents = folderContents[subfolder.id];
    const isLoading = loadingContents[subfolder.id];

    return (
      <Box key={subfolder.id} ml={4}>
        <HStack
          px={3}
          py={2}
          cursor="pointer"
          onClick={() => toggleFolder(subfolder.id)}
          rounded="md"
          _hover={{ bg: 'whiteAlpha.50' }}
          transition="all 0.15s"
          spacing={2}
        >
          <Icon
            as={isExpanded ? FiChevronDown : FiChevronRight}
            boxSize={3}
            color="gray.500"
          />
          <Icon as={FiFolder} boxSize={4} color="accent.400" />
          <Text color="white" fontSize="sm" fontWeight="medium" flex={1} noOfLines={1}>
            {subfolder.name}
          </Text>
          <Text color="gray.600" fontSize="xs">
            {subfolder.document_count || 0} files
          </Text>
        </HStack>

        <Collapse in={isExpanded} animateOpacity>
          {isLoading ? (
            <Center py={2} ml={4}>
              <Spinner size="xs" color="gray.500" />
            </Center>
          ) : contents ? (
            <VStack spacing={1} align="stretch" mt={1}>
              {contents.children?.map(child => renderSubfolder(child))}
              {contents.documents?.map(doc => renderDocumentItem(doc, subfolder.id))}
              {(!contents.children?.length && !contents.documents?.length) && (
                <Text color="gray.600" fontSize="xs" ml={8} py={1}>Empty folder</Text>
              )}
            </VStack>
          ) : null}
        </Collapse>
      </Box>
    );
  };

  return (
    <>
      <VStack spacing={1} align="stretch">
        {folders.map((folder) => {
          const isExpanded = expandedFolders[folder.id];
          const contents = folderContents[folder.id];
          const isLoadingContent = loadingContents[folder.id];

          return (
            <Box key={folder.id}>
              <HStack
                px={3}
                py={2.5}
                cursor="pointer"
                onClick={() => toggleFolder(folder.id)}
                rounded="md"
                bg="primary.700"
                border="1px"
                borderColor="primary.600"
                _hover={{ bg: 'primary.600', borderColor: 'primary.500' }}
                transition="all 0.15s"
                spacing={2}
              >
                <Icon
                  as={isExpanded ? FiChevronDown : FiChevronRight}
                  boxSize={3.5}
                  color="gray.400"
                  transition="transform 0.15s"
                />
                <Icon as={FiFolder} boxSize={5} color="accent.400" />
                <VStack align="start" spacing={0} flex={1} minW={0}>
                  <Text color="white" fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {folder.name}
                  </Text>
                  <HStack spacing={2} fontSize="xs" color="gray.500">
                    <Text>{folder.document_count || 0} files</Text>
                    {folder.subfolder_count > 0 && (
                      <>
                        <Text color="gray.600">·</Text>
                        <Text>{folder.subfolder_count} folders</Text>
                      </>
                    )}
                  </HStack>
                </VStack>
                <Icon as={FiUsers} boxSize={3} color="purple.400" />
              </HStack>

              <Collapse in={isExpanded} animateOpacity>
                <Box mt={1} mb={2}>
                  {isLoadingContent ? (
                    <Center py={3}>
                      <HStack spacing={2}>
                        <Spinner size="xs" color="gray.500" />
                        <Text color="gray.500" fontSize="xs">Loading contents...</Text>
                      </HStack>
                    </Center>
                  ) : contents ? (
                    <VStack spacing={1} align="stretch">
                      {contents.children?.map(child => renderSubfolder(child))}
                      {contents.documents?.map(doc => renderDocumentItem(doc, folder.id))}
                      {(!contents.children?.length && !contents.documents?.length) && (
                        <Text color="gray.600" fontSize="xs" textAlign="center" py={2}>
                          This folder is empty
                        </Text>
                      )}
                    </VStack>
                  ) : null}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </VStack>

      {/* Context Menu for documents */}
      {contextMenu.visible && contextMenu.doc && createPortal(
        <Box
          ref={menuRef}
          position="fixed"
          left={`${menuPos.x}px`}
          top={`${menuPos.y}px`}
          bg="primary.700"
          border="1px"
          borderColor="primary.600"
          rounded="md"
          py={1}
          px={1}
          minW="180px"
          zIndex={10000}
          boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
          onContextMenu={(e) => e.preventDefault()}
        >
          <VStack spacing={0} align="stretch">
            {/* Document name header */}
            <Box px={3} py={2} borderBottom="1px" borderColor="primary.600" mb={1}>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {contextMenu.doc.filename}
              </Text>
            </Box>

            <HStack
              px={3}
              py={2}
              cursor="pointer"
              onClick={() => handleView(contextMenu.doc.id)}
              rounded="md"
              _hover={{ bg: 'primary.600' }}
              spacing={3}
            >
              <Icon as={FiEye} boxSize={4} color="gray.400" />
              <Text fontSize="sm" color="gray.200">View</Text>
            </HStack>

            <HStack
              px={3}
              py={2}
              cursor="pointer"
              onClick={() => handleDownload(contextMenu.doc.id)}
              rounded="md"
              _hover={{ bg: 'primary.600' }}
              spacing={3}
            >
              <Icon as={FiDownload} boxSize={4} color="gray.400" />
              <Text fontSize="sm" color="gray.200">Download</Text>
            </HStack>

            <Divider borderColor="primary.600" my={1} />

            <HStack
              px={3}
              py={2}
              cursor="pointer"
              onClick={() => handleCopy(contextMenu.doc.id)}
              rounded="md"
              _hover={{ bg: 'primary.600' }}
              spacing={3}
            >
              <Icon as={FiCopy} boxSize={4} color="gray.400" />
              <Text fontSize="sm" color="gray.200">Make a copy</Text>
            </HStack>
          </VStack>
        </Box>,
        document.body
      )}
    </>
  );
};

export default GroupFolders;
