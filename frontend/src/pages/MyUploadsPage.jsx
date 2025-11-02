import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  HStack,
  Badge,
  Icon,
  useToast,
  Tabs,
  TabList,
  Tab,
  Flex,
  IconButton,
  Tooltip,
  ButtonGroup,
} from '@chakra-ui/react';
import { FiLock, FiGrid, FiList } from 'react-icons/fi';
import SearchBar from '../custom_components/SearchBar';
import SearchResults from '../custom_components/SearchResults';
import DocumentList from '../custom_components/DocumentList';
import DocumentViewer from '../custom_components/DocumentViewer';
import DocumentPreview from '../custom_components/DocumentPreview';
import FloatingMenu from '../custom_components/FloatingMenu';
import { searchAPI, documentsAPI } from '../utils/api';

const MyUploadsPage = () => {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
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
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      navigate('/auth');
      return;
    }

    const userData = JSON.parse(storedUser);
    setUser(userData);
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchMyDocuments();
    }
  }, [refreshTrigger, user]);

  const fetchMyDocuments = async () => {
    try {
      const response = await documentsAPI.listMyDocuments();
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
      <Box
        bg="primary.800"
        borderBottom="1px"
        borderColor="primary.600"
        px={6}
        py={4}
        position="sticky"
        top={0}
        zIndex={100}
      >
        <HStack justify="space-between">
          <HStack spacing={4}>
            <Icon as={FiLock} boxSize={6} color="accent.500" />
            <Heading size="md" color="white" fontWeight="bold">
              LOCKET.AI
            </Heading>
          </HStack>

          <HStack spacing={4}>
            <Text color="gray.400" fontSize="sm">
              {user.username}
            </Text>
            <Badge
              colorScheme={user.role === 'admin' ? 'purple' : 'accent'}
              fontSize="xs"
              px={3}
              py={1}
            >
              {user.role}
            </Badge>
          </HStack>
        </HStack>
      </Box>

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
          <Box bg="primary.800" borderBottom="1px" borderColor="primary.600">
            <Box px={6} pt={4} pb={2}>
              <SearchBar onSearch={handleSearch} isLoading={isSearching} />
            </Box>
            
            <Tabs colorScheme="accent" variant="line" px={6} defaultIndex={2}>
              <TabList borderBottom="none">
                <Tab
                  color="gray.400"
                  _selected={{ color: 'accent.500', borderColor: 'accent.500' }}
                  onClick={() => navigate('/')}
                >
                  Home
                </Tab>
                <Tab
                  color="gray.400"
                  _selected={{ color: 'accent.500', borderColor: 'accent.500' }}
                  onClick={() => navigate('/documents')}
                >
                  Documents
                </Tab>
                <Tab
                  color="gray.400"
                  _selected={{ color: 'accent.500', borderColor: 'accent.500' }}
                >
                  My Uploads
                </Tab>
                <Tab
                  color="gray.400"
                  _selected={{ color: 'accent.500', borderColor: 'accent.500' }}
                  onClick={() => navigate('/upload')}
                >
                  Upload
                </Tab>
              </TabList>
            </Tabs>
          </Box>

          <Box flex={1} overflowY="auto" p={6}>
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
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    My Uploads
                  </Text>
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
          </Box>
        </Box>

        {/* Document Preview Panel */}
        <Box
          position="fixed"
          right={0}
          top="59px"
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

export default MyUploadsPage;