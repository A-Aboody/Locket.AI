import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
} from '@chakra-ui/react';
import DocumentUpload from '../custom_components/DocumentUpload';
import DocumentList from '../custom_components/DocumentList';
import DocumentViewer from '../custom_components/DocumentViewer';
import SearchBar from '../custom_components/SearchBar';
import SearchResults from '../custom_components/SearchResults';
import { searchAPI } from '../utils/api';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewingDocumentId, setViewingDocumentId] = useState(null);
  
  // Search state
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

    setUser(JSON.parse(storedUser));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    
    toast({
      title: 'Document indexed',
      description: 'Your document has been uploaded and is now searchable with AI',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSearch = async (query) => {
    // If empty query, clear search and return to default view
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
    // Re-run the search after delete to refresh results
    if (searchQuery) {
      handleSearch(searchQuery);
    }
  };

  const handleViewDocument = (documentId) => {
    setViewingDocumentId(documentId);
  };

  const handleCloseViewer = () => {
    setViewingDocumentId(null);
  };

  if (!user) {
    return null;
  }

  return (
    <Box minH="100vh" bg="gray.100" py={8}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box bg="white" p={6} rounded="lg" shadow="md">
            <HStack justify="space-between">
              <Box>
                <Heading size="lg">Document Retrieval System</Heading>
                <HStack mt={2}>
                  <Text color="gray.600">Welcome, {user.username}!</Text>
                  <Badge colorScheme={user.role === 'admin' ? 'purple' : 'blue'}>
                    {user.role}
                  </Badge>
                </HStack>
              </Box>
              <Button colorScheme="red" onClick={handleLogout}>
                Logout
              </Button>
            </HStack>
          </Box>

          {/* Search Bar */}
          <Box bg="white" p={6} rounded="lg" shadow="md">
            <SearchBar onSearch={handleSearch} isLoading={isSearching} />
          </Box>

          {/* Main Content */}
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
            <Tabs colorScheme="blue" variant="enclosed">
              <TabList>
                <Tab>All Documents</Tab>
                <Tab>Upload</Tab>
              </TabList>

              <TabPanels>
                <TabPanel p={0} pt={6}>
                  <DocumentList
                    refreshTrigger={refreshTrigger}
                    onViewDocument={handleViewDocument}
                  />
                </TabPanel>

                <TabPanel p={0} pt={6}>
                  <DocumentUpload onUploadSuccess={handleUploadSuccess} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default HomePage;