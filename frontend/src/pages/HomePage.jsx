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
  Tabs,
  TabList,
  Tab,
  Flex,
} from '@chakra-ui/react';
import { FiLock, FiArrowRight } from 'react-icons/fi';
import SearchBar from '../custom_components/SearchBar';
import SearchResults from '../custom_components/SearchResults';
import DocumentList from '../custom_components/DocumentList';
import DocumentViewer from '../custom_components/DocumentViewer';
import DocumentPreview from '../custom_components/DocumentPreview';
import FloatingMenu from '../custom_components/FloatingMenu';
import { searchAPI, documentsAPI } from '../utils/api';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [myUploadsDocs, setMyUploadsDocs] = useState([]);
  const [viewingDocumentId, setViewingDocumentId] = useState(null);
  const [previewDocumentId, setPreviewDocumentId] = useState(null);
  
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
    fetchRecentActivity();
    fetchMyUploads(userData.username);
  }, [navigate]);

  const fetchRecentActivity = async () => {
    try {
      const response = await documentsAPI.list({ limit: 5 });
      setRecentDocs(response.data);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    }
  };

  const fetchMyUploads = async (username) => {
    try {
      const response = await documentsAPI.listMyDocuments({ limit: 5 });
      setMyUploadsDocs(response.data);
    } catch (error) {
      console.error('Failed to fetch user uploads:', error);
    }
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
      {/* Top Header Bar */}
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
          {/* Search Bar and Tabs */}
          <Box bg="primary.800" borderBottom="1px" borderColor="primary.600">
            <Box px={6} pt={4} pb={2}>
              <SearchBar onSearch={handleSearch} isLoading={isSearching} />
            </Box>
            
            <Tabs colorScheme="accent" variant="line" px={6}>
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
                  onClick={() => navigate('/my-uploads')}
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

          {/* Content Area */}
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
                <VStack spacing={8} align="stretch">
                  {/* Recent Activity */}
                  <Box>
                    <HStack justify="space-between" mb={4}>
                      <Text fontSize="xl" fontWeight="bold" color="accent.500">
                        Recent Activity
                      </Text>
                    </HStack>
                    <DocumentList
                      documents={recentDocs}
                      onViewDocument={handleViewDocument}
                      emptyMessage="No recent activity"
                    />
                  </Box>

                  {/* My Uploads */}
                  <Box>
                    <HStack justify="space-between" mb={4}>
                      <Text fontSize="xl" fontWeight="bold" color="accent.500">
                        My Uploads
                      </Text>
                      {myUploadsDocs.length >= 5 && (
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
                    />
                  </Box>
                </VStack>
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

export default HomePage;