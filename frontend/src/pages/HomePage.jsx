import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  VStack,
  Badge,
  Button,
  Icon,
  useToast,
  Flex,
  IconButton,
  Tooltip,
  ButtonGroup,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
} from '@chakra-ui/react';
import { FiArrowRight, FiGrid, FiList, FiPlus, FiEdit2 } from 'react-icons/fi';
import SearchBar from '../custom_components/SearchBar';
import SearchResults from '../custom_components/SearchResults';
import DocumentList from '../custom_components/DocumentList';
import DocumentViewer from '../custom_components/DocumentViewer';
import DocumentPreview from '../custom_components/DocumentPreview';
import FloatingMenu from '../custom_components/FloatingMenu';
import AppHeader from '../custom_components/AppHeader';
import NavTabs from '../custom_components/NavTabs';
import PageTransition from '../custom_components/PageTransition';
import { searchAPI, documentsAPI, foldersAPI, userGroupsAPI } from '../utils/api';
import { getCurrentMode } from '../utils/documentFilters';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]); // Docs for display
  const [myUploadsDocs, setMyUploadsDocs] = useState([]); // Docs for display
  const [viewingDocumentId, setViewingDocumentId] = useState(null);
  const [previewDocumentId, setPreviewDocumentId] = useState(null);
  const [viewMode, setViewMode] = useState(localStorage.getItem('documentViewMode') || 'card');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [folderSearchResults, setFolderSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  // Folders and groups for context menu
  const [folders, setFolders] = useState([]);
  const [groups, setGroups] = useState([]);

  // Rename state
  const [renameDoc, setRenameDoc] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const { isOpen: isRenameOpen, onOpen: onRenameOpen, onClose: onRenameClose } = useDisclosure();

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    // Get user data from localStorage (ProtectedRoute already verified auth)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      fetchRecentActivity();
      fetchMyUploads();
      fetchFolders();
      fetchGroups();
    }
  }, []);

  // Listen for mode changes and re-fetch documents from backend
  useEffect(() => {
    const handleModeChange = () => {
      if (user) {
        // Re-fetch documents when mode changes (backend filters by mode)
        fetchRecentActivity();
        fetchMyUploads();
      }
    };

    window.addEventListener('modeChanged', handleModeChange);
    return () => window.removeEventListener('modeChanged', handleModeChange);
  }, [user]);

  const fetchRecentActivity = async () => {
    try {
      // Fetch recently viewed/interacted documents from the activity tracking endpoint
      const mode = getCurrentMode();
      const response = await documentsAPI.getRecentActivity({ limit: 6, mode });
      setRecentDocs(response.data);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    }
  };

  const fetchMyUploads = async () => {
    try {
      const mode = getCurrentMode();
      const response = await documentsAPI.listMyDocuments({ limit: 100 });
      let docs = response.data;
      // In personal mode, only show private documents
      if (mode === 'personal') {
        docs = docs.filter(doc => doc.visibility === 'private');
      }
      setMyUploadsDocs(docs.slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch user uploads:', error);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await foldersAPI.list({});
      setFolders(response.data);
    } catch {
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
    toast({
      title: 'Profile',
      description: 'Profile management coming soon!',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSettings = () => {
    navigate('/settings');
  };

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
      toast({
        title: 'Search failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setSearchResults([]);
      setFolderSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchUpdate = () => {
    if (searchQuery) {
      handleSearch(searchQuery);
    }
  };

  const handleViewDocument = (documentId) => {
    setPreviewDocumentId(documentId);
    // Record preview activity
    documentsAPI.recordActivity(documentId, 'preview').catch(() => {});
  };

  const handleViewDocumentFullScreen = (documentId) => {
    // Open document viewer directly (used for user groups modal)
    setViewingDocumentId(documentId);
    // Record full view activity
    documentsAPI.recordActivity(documentId, 'view').then(() => {
      fetchRecentActivity();
    }).catch(() => {});
  };

  const handleOpenFullViewer = () => {
    if (previewDocumentId) {
      setViewingDocumentId(previewDocumentId);
      // Record full view activity
      documentsAPI.recordActivity(previewDocumentId, 'view').then(() => {
        fetchRecentActivity();
      }).catch(() => {});
    }
  };

  const handleCloseViewer = () => {
    setViewingDocumentId(null);
  };

  const handleClosePreview = () => {
    setPreviewDocumentId(null);
  };

  const handleRefresh = () => {
    fetchRecentActivity();
    fetchMyUploads();
  };

  const handleRename = (doc) => {
    setRenameDoc(doc);
    const lastDot = doc.filename.lastIndexOf('.');
    setRenameValue(lastDot > 0 ? doc.filename.substring(0, lastDot) : doc.filename);
    onRenameOpen();
  };

  const handleRenameConfirm = async () => {
    if (!renameValue.trim() || !renameDoc) return;
    const lastDot = renameDoc.filename.lastIndexOf('.');
    const ext = lastDot > 0 ? renameDoc.filename.substring(lastDot) : '';
    const newFilename = renameValue.trim() + ext;
    try {
      await documentsAPI.rename(renameDoc.id, newFilename);
      toast({ title: 'Document renamed', status: 'success', duration: 3000, isClosable: true });
      handleRefresh();
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
      handleRefresh();
    } catch (error) {
      toast({ title: 'Move failed', description: error.response?.data?.detail || 'An error occurred', status: 'error', duration: 5000, isClosable: true });
    }
  };

  if (!user) {
    return null;
  }

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

          {/* Search Bar */}
          <Box bg="primary.800" borderBottom="1px" borderColor="primary.600">
            <Box px={6} pt={4} pb={2}>
              <SearchBar onSearch={handleSearch} isLoading={isSearching} />
            </Box>
          </Box>

          <Box flex={1} overflowY="auto" p={6}>
            {viewingDocumentId && (
              <DocumentViewer
                documentId={viewingDocumentId}
                onClose={handleCloseViewer}
              />
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
                    navigate('/documents', { state: { selectedFolderId: folderId } });
                  }}
                />
              ) : (
                <Box maxW="100%">
                  {/* View Toggle and Upload Button */}
                  <HStack justify="space-between" mb={4}>
                    <Tooltip label="Upload document" placement="right">
                      <IconButton
                        icon={<FiPlus />}
                        onClick={() => navigate('/upload', { state: { from: '/dashboard' } })}
                        aria-label="Upload document"
                        size="md"
                        colorScheme="accent"
                        bg="accent.500"
                        color="white"
                        borderRadius="lg"
                        _hover={{
                          bg: 'accent.600',
                          transform: 'translateY(-2px)',
                        }}
                        _active={{
                          bg: 'accent.700',
                          transform: 'translateY(0)',
                        }}
                        transition="all 0.2s ease-in-out"
                      />
                    </Tooltip>
                    <ButtonGroup size="sm" isAttached variant="outline">
                      <Tooltip label="Card view">
                        <IconButton
                          icon={<FiGrid />}
                          onClick={() => handleViewModeChange('card')}
                          aria-label="Card view"
                          colorScheme={viewMode === 'card' ? 'accent' : 'gray'}
                          bg={viewMode === 'card' ? 'accent.500' : 'transparent'}
                          color={viewMode === 'card' ? 'white' : 'gray.400'}
                          _hover={{
                            bg: viewMode === 'card' ? 'accent.600' : 'primary.700',
                          }}
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
                          _hover={{
                            bg: viewMode === 'list' ? 'accent.600' : 'primary.700',
                          }}
                        />
                      </Tooltip>
                    </ButtonGroup>
                  </HStack>

                  <VStack spacing={8} align="stretch">
                    {/* Recent Activity */}
                    <Box>
                      <HStack justify="space-between" mb={4}>
                        <Button
                          variant="ghost"
                          fontSize="xl"
                          fontWeight="bold"
                          color="white"
                          px={2}
                          h="auto"
                          py={1}
                          _hover={{ color: 'accent.400', bg: 'transparent' }}
                          onClick={() => navigate('/documents')}
                          rightIcon={<FiArrowRight size={16} />}
                        >
                          Recent Activity
                        </Button>
                      </HStack>
                      <DocumentList
                        documents={recentDocs}
                        onViewDocument={handleViewDocument}
                        onViewFullScreen={handleViewDocumentFullScreen}
                        onDelete={handleRefresh}
                        onRename={handleRename}
                        onMoveToFolder={handleMoveToFolder}
                        groups={groups}
                        folders={folders}
                        emptyMessage="No recent activity"
                        viewMode={viewMode}
                      />
                    </Box>

                    {/* My Uploads */}
                    <Box>
                      <HStack justify="space-between" mb={4}>
                        <Button
                          variant="ghost"
                          fontSize="xl"
                          fontWeight="bold"
                          color="white"
                          px={2}
                          h="auto"
                          py={1}
                          _hover={{ color: 'accent.400', bg: 'transparent' }}
                          onClick={() => navigate('/my-uploads')}
                          rightIcon={<FiArrowRight size={16} />}
                        >
                          My Uploads
                        </Button>
                      </HStack>
                      <DocumentList
                        documents={myUploadsDocs}
                        onViewDocument={handleViewDocument}
                        onViewFullScreen={handleViewDocumentFullScreen}
                        onDelete={handleRefresh}
                        onRename={handleRename}
                        onMoveToFolder={handleMoveToFolder}
                        groups={groups}
                        folders={folders}
                        emptyMessage="You haven't uploaded any documents yet"
                        viewMode={viewMode}
                      />
                    </Box>
                  </VStack>
                </Box>
              )}
            </PageTransition>
          </Box>
        </Box>

        {/* Document Preview Panel */}
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

export default HomePage;