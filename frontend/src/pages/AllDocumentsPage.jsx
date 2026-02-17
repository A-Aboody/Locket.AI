import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Text,
  HStack,
  useToast,
  useDisclosure,
  Flex,
  IconButton,
  Tooltip,
  ButtonGroup,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@chakra-ui/react';
import { FiGrid, FiList, FiPlus, FiFolder, FiEdit2 } from 'react-icons/fi';
import SearchBar from '../custom_components/SearchBar';
import SearchResults from '../custom_components/SearchResults';
import DocumentList from '../custom_components/DocumentList';
import DocumentViewer from '../custom_components/DocumentViewer';
import DocumentPreview from '../custom_components/DocumentPreview';
import FloatingMenu from '../custom_components/FloatingMenu';
import AppHeader from '../custom_components/AppHeader';
import NavTabs from '../custom_components/NavTabs';
import PageTransition from '../custom_components/PageTransition';
import FolderBreadcrumb from '../custom_components/FolderBreadcrumb';
import FolderList from '../custom_components/FolderList';
import CreateFolderModal from '../custom_components/CreateFolderModal';
import FilterBar from '../custom_components/FilterBar';
import { searchAPI, documentsAPI, foldersAPI, userGroupsAPI } from '../utils/api';
import { getCurrentMode } from '../utils/documentFilters';

const AllDocumentsPage = () => {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewingDocumentId, setViewingDocumentId] = useState(null);
  const [previewDocumentId, setPreviewDocumentId] = useState(null);
  const [viewMode, setViewMode] = useState(localStorage.getItem('documentViewMode') || 'card');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [folderSearchResults, setFolderSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  // Folder state
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentFolderData, setCurrentFolderData] = useState(null);
  const [folders, setFolders] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [folderTransitioning, setFolderTransitioning] = useState(false);
  const { isOpen: isCreateFolderOpen, onOpen: onCreateFolderOpen, onClose: onCreateFolderClose } = useDisclosure();

  // Groups for context menu
  const [groups, setGroups] = useState([]);

  // Filter state
  const [filters, setFilters] = useState({ file_type: '', date_from: '', date_to: '', visibility: '', group_ids: [] });

  // Rename state
  const [renameDoc, setRenameDoc] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const { isOpen: isRenameOpen, onOpen: onRenameOpen, onClose: onRenameClose } = useDisclosure();

  // Folder display preference - per-user key
  const [folderDisplayMode, setFolderDisplayMode] = useState(() => {
    const storedUser = localStorage.getItem('user');
    const userId = storedUser ? JSON.parse(storedUser).id : null;
    const key = userId ? `folderDisplayMode_${userId}` : 'folderDisplayMode';
    return localStorage.getItem(key) || 'separate';
  });

  // Also update when user state loads
  useEffect(() => {
    if (user) {
      const key = `folderDisplayMode_${user.id}`;
      const stored = localStorage.getItem(key);
      if (stored) setFolderDisplayMode(stored);
    }
  }, [user]);

  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Handle folder selection from FoldersModal
  useEffect(() => {
    if (location.state?.selectedFolderId) {
      setCurrentFolderId(location.state.selectedFolderId);
    }
  }, [location.state?.selectedFolderId]);

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        await Promise.all([fetchAllDocuments(), fetchFolders()]);
        setFolderTransitioning(false);
      };
      loadData();
      fetchGroups();
    }
  }, [refreshTrigger, user, currentFolderId, filters]);

  useEffect(() => {
    const handleModeChange = () => {
      if (user) {
        fetchAllDocuments();
        fetchFolders();
      }
    };
    window.addEventListener('modeChanged', handleModeChange);
    return () => window.removeEventListener('modeChanged', handleModeChange);
  }, [user, currentFolderId, filters]);

  // Listen for preferences changes
  useEffect(() => {
    const handlePrefsChange = (e) => {
      if (e.detail?.folderDisplayMode) {
        setFolderDisplayMode(e.detail.folderDisplayMode);
      }
    };
    window.addEventListener('preferencesChanged', handlePrefsChange);
    return () => window.removeEventListener('preferencesChanged', handlePrefsChange);
  }, []);

  const fetchAllDocuments = async () => {
    try {
      const mode = getCurrentMode();
      const params = { mode };
      if (currentFolderId !== null) {
        params.folder_id = currentFolderId;
      }
      if (filters.file_type) params.file_type = filters.file_type;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const response = await documentsAPI.list(params);
      let docs = response.data;
      // Apply visibility filter client-side
      if (filters.visibility === 'private') {
        docs = docs.filter(d => d.visibility === 'private');
      } else if (filters.visibility === 'organization') {
        docs = docs.filter(d => d.visibility === 'organization');
      } else if (filters.visibility === 'group') {
        if (filters.group_ids && filters.group_ids.length > 0) {
          docs = docs.filter(d => d.visibility === 'group' && filters.group_ids.includes(d.user_group_id));
        } else {
          docs = docs.filter(d => d.visibility === 'group');
        }
      }
      setDocuments(docs);
    } catch (error) {
      toast({
        title: 'Failed to load documents',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const fetchFolders = async () => {
    try {
      const params = { mode: getCurrentMode() };
      if (currentFolderId !== null) {
        params.parent_id = currentFolderId;
      }
      const response = await foldersAPI.list(params);
      // Sort folders by ID to maintain consistent order on refresh
      const sortedFolders = [...response.data].sort((a, b) => a.id - b.id);
      setFolders(sortedFolders);

      // Fetch breadcrumb if inside a folder
      if (currentFolderId) {
        const folderResponse = await foldersAPI.get(currentFolderId);
        setBreadcrumb(folderResponse.data.breadcrumb || []);
        setCurrentFolderData(folderResponse.data);
      } else {
        setBreadcrumb([]);
        setCurrentFolderData(null);
      }
    } catch (error) {
      // Silently fail for folders
      setFolders([]);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await userGroupsAPI.list();
      setGroups(response.data.groups || response.data || []);
    } catch {
      setGroups([]);
    }
  };

  const handleFolderNavigate = (folderId) => {
    setFolderTransitioning(true);
    setCurrentFolderId(folderId);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('documentViewMode', mode);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const handleProfile = () => {
    toast({ title: 'Profile', description: 'Profile management coming soon!', status: 'info', duration: 3000, isClosable: true });
  };

  const handleSettings = () => navigate('/settings');

  const handleSearch = async (query) => {
    if (!query || query.trim() === '') {
      setSearchQuery('');
      setSearchResults(null);
      setFolderSearchResults([]);
      return;
    }
    setSearchQuery(query);
    setIsSearching(true);
    try {
      const [docResponse, folderResponse] = await Promise.all([
        searchAPI.search(query),
        foldersAPI.list({ search: query }),
      ]);
      setSearchResults(docResponse.data.results);
      setFolderSearchResults(folderResponse.data || []);
      setSearchTime(docResponse.data.search_time_ms);
    } catch (error) {
      toast({ title: 'Search failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
      setSearchResults([]);
      setFolderSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchUpdate = () => {
    if (searchQuery) {
      handleSearch(searchQuery);
    } else {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleViewDocument = (documentId) => {
    setPreviewDocumentId(documentId);
    documentsAPI.recordActivity(documentId, 'preview').catch(() => {});
  };

  const handleViewDocumentFullScreen = (documentId) => {
    setViewingDocumentId(documentId);
    documentsAPI.recordActivity(documentId, 'view').catch(() => {});
  };

  const handleOpenFullViewer = () => {
    if (previewDocumentId) {
      setViewingDocumentId(previewDocumentId);
      documentsAPI.recordActivity(previewDocumentId, 'view').catch(() => {});
    }
  };

  const handleCloseViewer = () => setViewingDocumentId(null);
  const handleClosePreview = () => setPreviewDocumentId(null);

  const handleRename = (doc) => {
    setRenameDoc(doc);
    // Strip extension for editing, we'll re-add it on confirm
    const lastDot = doc.filename.lastIndexOf('.');
    setRenameValue(lastDot > 0 ? doc.filename.substring(0, lastDot) : doc.filename);
    onRenameOpen();
  };

  const handleRenameConfirm = async () => {
    if (!renameValue.trim() || !renameDoc) return;
    // Preserve the original file extension
    const lastDot = renameDoc.filename.lastIndexOf('.');
    const ext = lastDot > 0 ? renameDoc.filename.substring(lastDot) : '';
    const newFilename = renameValue.trim() + ext;
    try {
      await documentsAPI.rename(renameDoc.id, newFilename);
      toast({ title: 'Document renamed', status: 'success', duration: 3000, isClosable: true });
      handleSearchUpdate();
    } catch (error) {
      toast({ title: 'Rename failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    } finally {
      onRenameClose();
      setRenameDoc(null);
    }
  };

  const handleMoveToFolder = async (docId, folderId) => {
    try {
      await foldersAPI.moveDocument(docId, folderId);
      toast({ title: 'Document moved', status: 'success', duration: 3000, isClosable: true });
      handleSearchUpdate();
    } catch (error) {
      toast({ title: 'Move failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleFolderRename = (renamedFolder) => {
    // Update folder in local state without refetching
    setFolders(folders.map(f => f.id === renamedFolder.id ? renamedFolder : f));
  };

  if (!user) return null;

  return (
    <Box minH="100vh" bg="background.primary">
      <AppHeader user={user} />

      <Flex h="calc(100vh - 73px)">
        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          overflow="hidden"
          transition="all 0.3s ease-in-out"
          mr={previewDocumentId && !viewingDocumentId ? '350px' : '0'}
        >
          <NavTabs />

          <Box bg="primary.800" borderBottom="1px" borderColor="primary.600">
            <Box px={6} pt={4} pb={2}>
              <SearchBar onSearch={handleSearch} isLoading={isSearching} />
            </Box>
          </Box>

          <Box flex={1} overflowY="auto" p={6}>
            {viewingDocumentId && (
              <DocumentViewer documentId={viewingDocumentId} onClose={handleCloseViewer} />
            )}
            <PageTransition>
              {searchQuery ? (
                <SearchResults
                  results={searchResults}
                  query={searchQuery}
                  searchTime={searchTime}
                  isLoading={isSearching}
                  onViewDocument={handleViewDocument}
                  onSearchUpdate={handleSearchUpdate}
                  folderResults={folderSearchResults}
                  onFolderNavigate={(folderId) => {
                    setSearchQuery('');
                    setSearchResults(null);
                    setFolderSearchResults([]);
                    handleFolderNavigate(folderId);
                  }}
                />
              ) : (
                <Box maxW="100%">
                  <HStack justify="space-between" mb={4}>
                    <HStack spacing={4}>
                      <Tooltip label="Upload document" placement="right">
                        <IconButton
                          icon={<FiPlus />}
                          onClick={() => navigate('/upload', { state: { from: '/documents', folderId: currentFolderId } })}
                          aria-label="Upload document"
                          size="md"
                          colorScheme="accent"
                          bg="accent.500"
                          color="white"
                          borderRadius="lg"
                          _hover={{ bg: 'accent.600', transform: 'translateY(-2px)' }}
                          _active={{ bg: 'accent.700', transform: 'translateY(0)' }}
                          transition="all 0.2s ease-in-out"
                        />
                      </Tooltip>
                      <Tooltip label="New folder" placement="right">
                        <IconButton
                          icon={<FiFolder />}
                          onClick={onCreateFolderOpen}
                          aria-label="New folder"
                          size="md"
                          variant="outline"
                          color="gray.400"
                          borderColor="whiteAlpha.200"
                          borderRadius="lg"
                          _hover={{ bg: 'primary.700', color: 'white' }}
                          transition="all 0.2s ease-in-out"
                        />
                      </Tooltip>
                      <Text fontSize="xl" fontWeight="bold" color="white">
                        All Documents
                      </Text>
                    </HStack>
                    <ButtonGroup size="sm" isAttached variant="outline">
                      <Tooltip label="Card view">
                        <IconButton
                          icon={<FiGrid />}
                          onClick={() => handleViewModeChange('card')}
                          aria-label="Card view"
                          colorScheme={viewMode === 'card' ? 'accent' : 'gray'}
                          bg={viewMode === 'card' ? 'accent.500' : 'transparent'}
                          color={viewMode === 'card' ? 'white' : 'gray.400'}
                          _hover={{ bg: viewMode === 'card' ? 'accent.600' : 'primary.700' }}
                        />
                      </Tooltip>
                      <Tooltip label="List view">
                        <IconButton
                          icon={<FiList />}
                          onClick={() => handleViewModeChange('list')}
                          aria-label="List view"
                          colorScheme={viewMode === 'list' ? 'accent' : 'gray'}
                          bg={viewMode === 'list' ? 'accent.500' : 'transparent'}
                          color={viewMode === 'list' ? 'white' : 'gray.400'}
                          _hover={{ bg: viewMode === 'list' ? 'accent.600' : 'primary.700' }}
                        />
                      </Tooltip>
                    </ButtonGroup>
                  </HStack>

                  {/* Filters */}
                  <FilterBar filters={filters} onFiltersChange={setFilters} groups={groups} />

                  {/* Breadcrumb */}
                  {(currentFolderId || breadcrumb.length > 0) && (
                    <FolderBreadcrumb
                      breadcrumb={breadcrumb}
                      onNavigate={handleFolderNavigate}
                      rootLabel="All Documents"
                    />
                  )}

                  <Box
                    opacity={folderTransitioning ? 0.5 : 1}
                    transition="opacity 0.15s ease-in-out"
                    pointerEvents={folderTransitioning ? 'none' : 'auto'}
                  >
                    {/* Folders - hide when filtering by file type or visibility */}
                    {folderDisplayMode === 'separate' && !filters.file_type && !filters.visibility && (
                      <FolderList
                        folders={folders}
                        onNavigate={handleFolderNavigate}
                        onRefresh={handleSearchUpdate}
                        onRenameFolder={handleFolderRename}
                      />
                    )}

                    <DocumentList
                      documents={documents}
                      onViewDocument={handleViewDocument}
                      onViewFullScreen={handleViewDocumentFullScreen}
                      onDelete={handleSearchUpdate}
                      onRename={handleRename}
                      onMoveToFolder={handleMoveToFolder}
                      groups={groups}
                      folders={folders}
                      emptyMessage="No documents in the system"
                      viewMode={viewMode}
                      inlineFolders={folderDisplayMode === 'inline' && !filters.file_type && !filters.visibility ? folders : []}
                      onFolderNavigate={handleFolderNavigate}
                      onFolderRefresh={handleSearchUpdate}
                    />
                  </Box>
                </Box>
              )}
            </PageTransition>
          </Box>
        </Box>

        <Box
          position="fixed"
          right={0}
          top="73px"
          bottom={0}
          w="350px"
          transform={`translateX(${previewDocumentId && !viewingDocumentId ? '0' : '100%'})`}
          transition="transform 0.3s ease-in-out"
          zIndex={50}
        >
          {previewDocumentId && !viewingDocumentId && (
            <DocumentPreview
              documentId={previewDocumentId}
              onClose={handleClosePreview}
              onViewDocument={handleOpenFullViewer}
            />
          )}
        </Box>
      </Flex>

      <FloatingMenu
        onProfile={handleProfile}
        onSettings={handleSettings}
        onLogout={handleLogout}
        onViewDocument={handleViewDocumentFullScreen}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={onCreateFolderClose}
        parentId={currentFolderId}
        onSuccess={handleSearchUpdate}
        inheritedScope={currentFolderData?.scope || null}
        inheritedGroupId={currentFolderData?.group_id || null}
        currentMode={getCurrentMode()}
      />

      {/* Rename Modal */}
      <Modal isOpen={isRenameOpen} onClose={onRenameClose} isCentered>
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <ModalContent bg="primary.800" border="1px" borderColor="primary.600" mx={4}>
          <ModalHeader color="white">
            <HStack spacing={3}>
              <Box p={2} bg="accent.500" rounded="lg">
                <FiEdit2 size={20} color="white" />
              </Box>
              <Text>Rename Document</Text>
            </HStack>
          </ModalHeader>
          <ModalBody>
            <HStack spacing={0}>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
                bg="primary.700"
                border="1px"
                borderColor="primary.600"
                color="white"
                _focus={{ borderColor: 'accent.500' }}
                autoFocus
                borderRightRadius={renameDoc ? 0 : 'md'}
              />
              {renameDoc && renameDoc.filename.lastIndexOf('.') > 0 && (
                <Box
                  px={3}
                  py={2}
                  bg="primary.600"
                  border="1px"
                  borderColor="primary.600"
                  borderLeft="none"
                  borderRightRadius="md"
                  color="gray.400"
                  fontSize="sm"
                  whiteSpace="nowrap"
                  userSelect="none"
                >
                  {renameDoc.filename.substring(renameDoc.filename.lastIndexOf('.'))}
                </Box>
              )}
            </HStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onRenameClose} variant="ghost" color="gray.400" _hover={{ bg: 'primary.700' }} mr={3}>
              Cancel
            </Button>
            <Button colorScheme="accent" bg="accent.500" onClick={handleRenameConfirm} isDisabled={!renameValue.trim()}>
              Rename
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AllDocumentsPage;
