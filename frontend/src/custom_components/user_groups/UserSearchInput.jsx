import { useState, useEffect } from 'react';
import {
  InputGroup,
  InputLeftElement,
  Input,
  VStack,
  Box,
  HStack,
  Text,
  Avatar,
  Center,
  Spinner,
} from '@chakra-ui/react';
import { FiSearch, FiCheck, FiUserPlus } from 'react-icons/fi';
import { usersAPI } from '../../utils/api';

const UserSearchInput = ({ 
  onUserSelect, 
  selectedUsers = [], 
  placeholder = "Search by username or email",
  size = "lg" 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      
      try {
        setIsSearching(true);
        const response = await usersAPI.search(searchQuery);
        setSearchResults(response.data || []);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUserClick = (user) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    if (!isSelected) {
      onUserSelect(user);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  return (
    <Box>
      <InputGroup size={size}>
        <InputLeftElement pointerEvents="none">
          <FiSearch color="#718096" />
        </InputLeftElement>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          color="white"
          bg="primary.800"
          border="2px"
          borderColor="primary.600"
          _hover={{ borderColor: 'primary.500' }}
          _focus={{ borderColor: 'accent.500', boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)' }}
          pl={10}
        />
      </InputGroup>
      
      {isSearching && (
        <Center py={4}>
          <Spinner size="sm" color="accent.500" />
        </Center>
      )}
      
      {searchResults.length > 0 && (
        <VStack 
          mt={3} 
          spacing={2} 
          align="stretch" 
          maxH="200px" 
          overflowY="auto"
          bg="primary.800"
          rounded="lg"
          p={2}
          border="1px"
          borderColor="primary.600"
        >
          {searchResults.map(user => {
            const isSelected = selectedUsers.some(u => u.id === user.id);
            return (
              <Box
                key={user.id}
                p={3}
                bg={isSelected ? 'accent.500' : 'primary.700'}
                rounded="md"
                cursor={isSelected ? 'default' : 'pointer'}
                onClick={() => handleUserClick(user)}
                _hover={!isSelected ? { bg: 'primary.600', transform: 'translateX(4px)' } : {}}
                transition="all 0.2s"
                border="1px"
                borderColor={isSelected ? 'accent.400' : 'transparent'}
              >
                <HStack justify="space-between">
                  <HStack spacing={3}>
                    <Avatar 
                      name={user.username} 
                      size="sm" 
                      bg={isSelected ? 'whiteAlpha.200' : 'accent.500'}
                      color="white"
                    />
                    <VStack align="start" spacing={0}>
                      <Text 
                        color={isSelected ? 'white' : 'gray.200'} 
                        fontSize="sm" 
                        fontWeight="medium"
                      >
                        {user.username}
                      </Text>
                      <Text 
                        color={isSelected ? 'whiteAlpha.800' : 'gray.400'} 
                        fontSize="xs"
                      >
                        {user.email}
                      </Text>
                    </VStack>
                  </HStack>
                  {isSelected ? (
                    <Box p={1.5} bg="white" rounded="full">
                      <FiCheck color="#48BB78" size={14} />
                    </Box>
                  ) : (
                    <FiUserPlus color="#A0AEC0" size={18} />
                  )}
                </HStack>
              </Box>
            );
          })}
        </VStack>
      )}
    </Box>
  );
};

export default UserSearchInput;