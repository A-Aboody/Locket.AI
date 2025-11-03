import { useState } from 'react';
import {
  VStack,
  Button,
  InputGroup,
  InputLeftElement,
  Input,
  Box,
  HStack,
  Avatar,
  Text,
  VStack as VStackChakra,
  IconButton,
} from '@chakra-ui/react';
import { FiUserPlus, FiSearch, FiX } from 'react-icons/fi';
import { usersAPI } from '../../utils/api';

const AddMemberForm = ({ groupId, onMemberAdded, onCancel, existingMembers = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await usersAPI.search(query);
      // Filter out users who are already members
      const filtered = (response.data || []).filter(
        user => !existingMembers.some(member => member.user_id === user.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    const timeoutId = setTimeout(() => handleSearch(value), 300);
    return () => clearTimeout(timeoutId);
  };

  const handleSelectUser = (user) => {
    onMemberAdded(user.id);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <VStack spacing={3} align="stretch">
      <HStack>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <FiSearch color="#718096" />
          </InputLeftElement>
          <Input
            placeholder="Search users to add..."
            size="md"
            color="white"
            bg="primary.700"
            border="2px"
            borderColor="primary.600"
            _hover={{ borderColor: 'primary.500' }}
            _focus={{ borderColor: 'accent.500', boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)' }}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            autoFocus
            pl={10}
          />
        </InputGroup>
        <IconButton
          icon={<FiX />}
          size="md"
          variant="ghost"
          color="gray.400"
          _hover={{ color: 'white', bg: 'primary.600' }}
          onClick={onCancel}
          aria-label="Cancel"
        />
      </HStack>
      
      {searchResults.length > 0 && (
        <VStackChakra 
          spacing={2} 
          align="stretch" 
          maxH="150px" 
          overflowY="auto"
          bg="primary.700"
          rounded="md"
          p={2}
          border="1px"
          borderColor="primary.600"
        >
          {searchResults.map(user => (
            <Box
              key={user.id}
              p={2}
              bg="primary.600"
              rounded="md"
              cursor="pointer"
              onClick={() => handleSelectUser(user)}
              _hover={{ bg: 'primary.500', transform: 'translateX(4px)' }}
              transition="all 0.2s"
            >
              <HStack justify="space-between">
                <HStack spacing={2}>
                  <Avatar 
                    name={user.username} 
                    size="xs" 
                    bg="accent.500"
                  />
                  <VStackChakra align="start" spacing={0}>
                    <Text color="white" fontSize="xs" fontWeight="medium">
                      {user.username}
                    </Text>
                    <Text color="gray.400" fontSize="xs">
                      {user.email}
                    </Text>
                  </VStackChakra>
                </HStack>
                <FiUserPlus color="#A0AEC0" size={14} />
              </HStack>
            </Box>
          ))}
        </VStackChakra>
      )}
      
      {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
        <Text color="gray.500" fontSize="sm" textAlign="center" py={2}>
          No users found
        </Text>
      )}
    </VStack>
  );
};

export default AddMemberForm;