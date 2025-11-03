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
} from '@chakra-ui/react';
import { FiArrowRight, FiGrid, FiList } from 'react-icons/fi';
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

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [myUploadsDocs, setMyUploadsDocs] = useState([]);
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
      fetchRecentActivity();
      fetchMyUploads(userData.username);
    }
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const response = await documentsAPI.list({ limit: 6 });
      setRecentDocs(response.data);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    }
  };

  const fetchMyUploads = async (username) => {
    try {
      const response = await documentsAPI.listMyDocuments({ limit: 6 });
      setMyUploadsDocs(response.data);
    } catch (error) {
      console.error('Failed to fetch user uploads:', error);
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
    toast({
      title: 'Settings',
      description: 'Settings panel coming soon!',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
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
      setSearchResults(response.data.results);
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
    }
  };

  const handleViewDocument = (documentId) => {
    setPreviewDocumentId(documentId);
  };

  const handleOpenFullViewer = () => {
    if (previewDocumentId) {
      setViewingDocumentId(previewDocumentId);
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
                  {/* View Toggle */}
                  <HStack justify="flex-end" mb={4}>
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
                        <Text fontSize="xl" fontWeight="bold" color="white">
                          Recent Activity
                        </Text>
                      </HStack>
                      <DocumentList
                        documents={recentDocs}
                        onViewDocument={handleViewDocument}
                        emptyMessage="No recent activity"
                        viewMode={viewMode}
                      />
                    </Box>

                    {/* My Uploads */}
                    <Box>
                      <HStack justify="space-between" mb={4}>
                        <Text fontSize="xl" fontWeight="bold" color="white">
                          My Uploads
                        </Text>
                        {myUploadsDocs.length >= 6 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="accent"
                            rightIcon={<FiArrowRight />}
                            onClick={() => navigate('/my-uploads')}
                            color="accent.400"
                            _hover={{ color: 'accent.300', bg: 'primary.700' }}
                          >
                            View More
                          </Button>
                        )}
                      </HStack>
                      <DocumentList
                        documents={myUploadsDocs}
                        onViewDocument={handleViewDocument}
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
      />
    </Box>
  );
};

export default HomePage;