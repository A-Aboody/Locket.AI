import { useState } from 'react';
import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Icon,
  IconButton,
} from '@chakra-ui/react';
import { FiSearch, FiX } from 'react-icons/fi';

const SearchBar = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
    } else {
      onSearch('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <Box>
      <InputGroup size="lg">
        <InputLeftElement pointerEvents="none">
          <Icon as={FiSearch} color="gray.500" />
        </InputLeftElement>
        <Input
          placeholder="Search for a document..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          bg="primary.700"
          borderColor="primary.500"
          color="white"
          _placeholder={{ color: 'gray.500' }}
          _hover={{ borderColor: 'accent.500' }}
          _focus={{
            borderColor: 'accent.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
          }}
          pr={query ? '50px' : '16px'}
        />
        {query && (
          <InputRightElement>
            <IconButton
              aria-label="Clear search"
              icon={<FiX />}
              size="sm"
              variant="ghost"
              onClick={handleClear}
              isDisabled={isLoading}
              color="gray.400"
              _hover={{ color: 'white', bg: 'primary.600' }}
            />
          </InputRightElement>
        )}
      </InputGroup>
    </Box>
  );
};

export default SearchBar;