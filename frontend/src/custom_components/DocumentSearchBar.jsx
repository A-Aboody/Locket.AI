//frontend/src/custom_components/DocumentSearchBar.jsx
import {
    HStack,
    Input,
    InputGroup,
    InputLeftElement,
    InputRightElement,
    IconButton,
    Text,
    Icon,
    Tooltip,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Spinner,
    Badge,
} from '@chakra-ui/react';
import {
    FiSearch,
    FiChevronUp,
    FiChevronDown,
    FiX,
    FiMoreVertical,
} from 'react-icons/fi';
import { useSearch } from '../contexts/SearchContext';
import { useRef, useEffect } from 'react';

const DocumentSearchBar = ({ onClose }) => {
    const {
        query,
        setQuery,
        matches,
        currentMatchIndex,
        isSearching,
        searchMode,
        setSearchMode,
        nextMatch,
        prevMatch,
        clearSearch,
    } = useSearch();

    const inputRef = useRef(null);

    // Auto-focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            if (e.shiftKey) {
                prevMatch();
            } else {
                nextMatch();
            }
        } else if (e.key === 'Escape') {
            clearSearch();
            onClose?.();
        }
    };

    const handleClear = () => {
        clearSearch();
        inputRef.current?.focus();
    };

    return (
        <HStack spacing={2} w="full">
            <InputGroup size="sm" maxW="400px">
                <InputLeftElement>
                    <Icon as={FiSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                    ref={inputRef}
                    placeholder={`Search in document${searchMode === 'semantic' ? ' (AI)' : ''}...`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    bg="primary.700"
                    border="1px"
                    borderColor="primary.600"
                    color="white"
                    pr="120px"
                    _placeholder={{ color: 'gray.500' }}
                    _focus={{ borderColor: 'accent.500' }}
                />
                <InputRightElement width="auto" pr={2}>
                    <HStack spacing={1}>
                        {isSearching && <Spinner size="xs" color="accent.500" />}
                        {matches.length > 0 && !isSearching && (
                            <Text fontSize="xs" color="gray.400" fontWeight="medium">
                                {currentMatchIndex + 1} / {matches.length}
                            </Text>
                        )}
                        {query && (
                            <IconButton
                                icon={<FiX />}
                                size="xs"
                                variant="ghost"
                                onClick={handleClear}
                                aria-label="Clear search"
                                color="gray.400"
                                _hover={{ color: 'white' }}
                            />
                        )}
                    </HStack>
                </InputRightElement>
            </InputGroup>

            <Tooltip label="Previous result (Shift+Enter)">
                <IconButton
                    icon={<FiChevronUp />}
                    onClick={prevMatch}
                    isDisabled={matches.length === 0}
                    size="sm"
                    aria-label="Previous result"
                    variant="ghost"
                    color="gray.400"
                    _hover={{ bg: 'primary.700', color: 'white' }}
                />
            </Tooltip>

            <Tooltip label="Next result (Enter)">
                <IconButton
                    icon={<FiChevronDown />}
                    onClick={nextMatch}
                    isDisabled={matches.length === 0}
                    size="sm"
                    aria-label="Next result"
                    variant="ghost"
                    color="gray.400"
                    _hover={{ bg: 'primary.700', color: 'white' }}
                />
            </Tooltip>

            <Menu>
                <Tooltip label="Search options">
                    <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        size="sm"
                        variant="ghost"
                        color="gray.400"
                        _hover={{ bg: 'primary.700', color: 'white' }}
                        aria-label="Search options"
                    />
                </Tooltip>
                <MenuList bg="primary.700" borderColor="primary.600">
                    <MenuItem
                        onClick={() => setSearchMode('text')}
                        bg={searchMode === 'text' ? 'primary.600' : 'transparent'}
                        _hover={{ bg: 'primary.600' }}
                        color="white"
                    >
                        <HStack justify="space-between" w="full">
                            <Text>Text Search</Text>
                            {searchMode === 'text' && (
                                <Badge colorScheme="green" size="sm">
                                    Active
                                </Badge>
                            )}
                        </HStack>
                    </MenuItem>
                    <MenuItem
                        onClick={() => setSearchMode('semantic')}
                        bg={searchMode === 'semantic' ? 'primary.600' : 'transparent'}
                        _hover={{ bg: 'primary.600' }}
                        color="white"
                    >
                        <HStack justify="space-between" w="full">
                            <Text>AI Search</Text>
                            {searchMode === 'semantic' && (
                                <Badge colorScheme="purple" size="sm">
                                    Active
                                </Badge>
                            )}
                        </HStack>
                    </MenuItem>
                </MenuList>
            </Menu>
        </HStack>
    );
};

export default DocumentSearchBar;