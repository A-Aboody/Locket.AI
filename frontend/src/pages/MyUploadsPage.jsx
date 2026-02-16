import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  HStack,
  useToast,
  Flex,
  IconButton,
  Tooltip,
  ButtonGroup,
} from '@chakra-ui/react';
import { FiGrid, FiList, FiPlus } from 'react-icons/fi';
import SearchBar from '../custom_components/SearchBar';
import SearchResults from '../custom_components/SearchResults';
import DocumentList from '../custom_components/DocumentList';
import DocumentViewer from '../custom_components/DocumentViewer';
import DocumentPreview from '../custom_components/DocumentPreview';
import FloatingMenu from '../custom_components/FloatingMenu';
import AppHeader from '../custom_components/AppHeader';
import NavTabs from '../custom_components/NavTabs';
import PageTransition from '../custom_components/PageTransition';
import { searchAPI, documentsAPI } from '../utils/api';

const MyUploadsPage = () => {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]); // All user's uploads for display
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewingDocumentId, setViewingDocumentId] = useState(null);
  const [previewDocumentId, setPreviewDocumentId] = useState(null);
  const [viewMode, setViewMode] = useState(localStorage.getItem('documentViewMode') || 'card');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    // Get user data from localStorage (ProtectedRoute already verified auth)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchMyDocuments();
    }
  }, [refreshTrigger, user]);

  // My Uploads always shows ALL documents the user uploaded regardless of mode.
  // No need to re-filter on mode change — this page is mode-independent.

  const fetchMyDocuments = async () => {
    try {
      const response = await documentsAPI.listMyDocuments();
      // My Uploads shows ALL documents uploaded by the current user, regardless of mode
      setDocuments(response.data);
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
      return;
    }

    setSearchQuery(query);
    setIsSearching(true);

    try {
      const response = await searchAPI.search(query);
      const userResults = response.data.results.filter(doc => doc.uploaded_by_username === user.username);
      setSearchResults(userResults);
      setSearchTime(response.data.search_time_ms);
    } catch (error) {
      toast({
        title: 'Search failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setSearchResults([]);
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
    // Open document viewer directly (used for user groups modal)
    setViewingDocumentId(documentId);
    documentsAPI.recordActivity(documentId, 'view').catch(() => {});
  };

  const handleOpenFullViewer = () => {
    if (previewDocumentId) {
      setViewingDocumentId(previewDocumentId);
      documentsAPI.recordActivity(previewDocumentId, 'view').catch(() => {});
    }
  };

  const handleCloseViewer = () => {
    setViewingDocumentId(null);
  };

  const handleClosePreview = () => {
    setPreviewDocumentId(null);
  };

  if (!user) {
    return null;
  }

  return (
    <Box minH="100vh" bg="background.primary">
      <AppHeader user={user} />

      <Flex h="calc(100vh - 73px)">
        {/* Main Content Area */}
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
            <PageTransition>
              {viewingDocumentId ? (
                <DocumentViewer
                  documentId={viewingDocumentId}
                  onClose={handleCloseViewer}
                />
              ) : searchQuery ? (
                <SearchResults
                  results={searchResults}
                  query={searchQuery}
                  searchTime={searchTime}
                  isLoading={isSearching}
                  onViewDocument={handleViewDocument}
                  onSearchUpdate={handleSearchUpdate}
                />
              ) : (
                <Box maxW="100%">
                  <HStack justify="space-between" mb={4}>
                    <HStack spacing={4}>
                      <Tooltip label="Upload document" placement="right">
                        <IconButton
                          icon={<FiPlus />}
                          onClick={() => navigate('/upload', { state: { from: '/my-uploads' } })}
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
                      <Text fontSize="xl" fontWeight="bold" color="white">
                        My Uploads
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
                  <DocumentList
                    documents={documents}
                    onViewDocument={handleViewDocument}
                    onDelete={handleSearchUpdate}
                    emptyMessage="You haven't uploaded any documents yet"
                    viewMode={viewMode}
                  />
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
    </Box>
  );
};

export default MyUploadsPage;