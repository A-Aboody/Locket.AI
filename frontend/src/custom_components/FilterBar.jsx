import { useState } from 'react';
import {
  HStack,
  VStack,
  Button,
  ButtonGroup,
  Input,
  Text,
  Box,
  Collapse,
  IconButton,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Icon,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
} from '@chakra-ui/react';
import { FiFilter, FiX, FiChevronDown, FiEyeOff, FiPackage, FiUsers, FiGlobe } from 'react-icons/fi';

const FILE_TYPES = [
  { label: 'All', value: '' },
  { label: 'PDF', value: 'pdf' },
  { label: 'DOCX', value: 'docx' },
  { label: 'DOC', value: 'doc' },
  { label: 'TXT', value: 'txt' },
];

const VISIBILITY_OPTIONS = [
  { label: 'All', value: '', icon: null },
  { label: 'Only Me', value: 'private', icon: FiEyeOff, color: 'gray.400' },
  { label: 'Organization', value: 'organization', icon: FiPackage, color: 'blue.400' },
  { label: 'User Groups', value: 'group', icon: FiUsers, color: 'accent.400' },
];

const FilterBar = ({ filters, onFiltersChange, groups = [] }) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = filters.file_type || filters.date_from || filters.date_to || filters.visibility || (filters.group_ids && filters.group_ids.length > 0);

  const handleFileTypeChange = (type) => {
    onFiltersChange({ ...filters, file_type: type });
  };

  const handleDateChange = (field, value) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const handleVisibilityChange = (vis) => {
    const newFilters = { ...filters, visibility: vis };
    // Clear group_ids if not filtering by group
    if (vis !== 'group') {
      newFilters.group_ids = [];
    }
    onFiltersChange(newFilters);
  };

  const handleGroupToggle = (groupId) => {
    const currentIds = filters.group_ids || [];
    const newIds = currentIds.includes(groupId)
      ? currentIds.filter(id => id !== groupId)
      : [...currentIds, groupId];
    onFiltersChange({ ...filters, visibility: 'group', group_ids: newIds });
  };

  const handleRemoveGroup = (groupId) => {
    const newIds = (filters.group_ids || []).filter(id => id !== groupId);
    if (newIds.length === 0) {
      onFiltersChange({ ...filters, visibility: '', group_ids: [] });
    } else {
      onFiltersChange({ ...filters, group_ids: newIds });
    }
  };

  const handleClearFilters = () => {
    onFiltersChange({ file_type: '', date_from: '', date_to: '', visibility: '', group_ids: [] });
  };

  const getVisibilityLabel = () => {
    if (filters.visibility === 'group' && filters.group_ids?.length > 0) {
      return `${filters.group_ids.length} group${filters.group_ids.length > 1 ? 's' : ''}`;
    }
    const opt = VISIBILITY_OPTIONS.find(o => o.value === (filters.visibility || ''));
    return opt ? opt.label : 'All';
  };

  return (
    <Box mb={hasActiveFilters || isOpen ? 4 : 0}>
      <HStack spacing={2} mb={isOpen ? 3 : 0}>
        <Tooltip label={isOpen ? 'Hide filters' : 'Show filters'}>
          <IconButton
            icon={<FiFilter />}
            size="sm"
            variant="ghost"
            color={hasActiveFilters ? 'accent.400' : 'gray.500'}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle filters"
            _hover={{ bg: 'primary.700', color: 'white' }}
          />
        </Tooltip>
        {hasActiveFilters && (
          <Button
            size="xs"
            variant="ghost"
            color="gray.500"
            leftIcon={<FiX />}
            onClick={handleClearFilters}
            _hover={{ bg: 'primary.700', color: 'white' }}
          >
            Clear filters
          </Button>
        )}
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <VStack
          spacing={3}
          p={3}
          bg="primary.800"
          border="1px"
          borderColor="primary.600"
          borderRadius="md"
          align="stretch"
        >
          <HStack spacing={4} flexWrap="wrap">
            {/* File Type Filter */}
            <HStack spacing={2}>
              <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                Type:
              </Text>
              <ButtonGroup size="xs" isAttached variant="outline">
                {FILE_TYPES.map((ft) => (
                  <Button
                    key={ft.value}
                    onClick={() => handleFileTypeChange(ft.value)}
                    bg={filters.file_type === ft.value ? 'accent.500' : 'transparent'}
                    color={filters.file_type === ft.value ? 'white' : 'gray.400'}
                    borderColor="primary.600"
                    _hover={{
                      bg: filters.file_type === ft.value ? 'accent.600' : 'primary.700',
                    }}
                  >
                    {ft.label}
                  </Button>
                ))}
              </ButtonGroup>
            </HStack>

            {/* Visibility Filter */}
            <HStack spacing={2}>
              <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                Visibility:
              </Text>
              <Menu>
                <MenuButton
                  as={Button}
                  size="xs"
                  variant="outline"
                  borderColor="primary.600"
                  color={filters.visibility ? 'accent.400' : 'gray.400'}
                  bg={filters.visibility ? 'whiteAlpha.50' : 'transparent'}
                  rightIcon={<FiChevronDown />}
                  _hover={{ bg: 'primary.700' }}
                  _active={{ bg: 'primary.700' }}
                >
                  {getVisibilityLabel()}
                </MenuButton>
                <MenuList
                  bg="primary.700"
                  borderColor="primary.600"
                  minW="180px"
                  py={1}
                >
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      onClick={() => handleVisibilityChange(opt.value)}
                      bg={filters.visibility === opt.value ? 'whiteAlpha.100' : 'transparent'}
                      _hover={{ bg: 'primary.600' }}
                      color="gray.200"
                      fontSize="sm"
                      icon={opt.icon ? <Icon as={opt.icon} color={opt.color} /> : undefined}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                  {groups.length > 0 && (
                    <>
                      <MenuDivider borderColor="primary.600" />
                      <Text px={3} py={1} fontSize="xs" color="gray.500">
                        Specific Groups
                      </Text>
                      {groups.map((group) => (
                        <MenuItem
                          key={group.id}
                          onClick={() => handleGroupToggle(group.id)}
                          bg={(filters.group_ids || []).includes(group.id) ? 'accent.500' : 'transparent'}
                          _hover={{ bg: (filters.group_ids || []).includes(group.id) ? 'accent.600' : 'primary.600' }}
                          color={(filters.group_ids || []).includes(group.id) ? 'white' : 'gray.200'}
                          fontSize="sm"
                          icon={<Icon as={FiUsers} color={(filters.group_ids || []).includes(group.id) ? 'white' : 'gray.400'} />}
                        >
                          {group.name}
                        </MenuItem>
                      ))}
                    </>
                  )}
                </MenuList>
              </Menu>
            </HStack>

            {/* Date Range Filter */}
            <HStack spacing={2}>
              <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                From:
              </Text>
              <Input
                type="date"
                size="xs"
                value={filters.date_from}
                onChange={(e) => handleDateChange('date_from', e.target.value)}
                bg="primary.700"
                border="1px"
                borderColor="primary.600"
                color="white"
                w="140px"
                _focus={{ borderColor: 'accent.500' }}
                sx={{
                  '&::-webkit-calendar-picker-indicator': {
                    filter: 'invert(1)',
                    cursor: 'pointer',
                  },
                }}
              />
            </HStack>
            <HStack spacing={2}>
              <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                To:
              </Text>
              <Input
                type="date"
                size="xs"
                value={filters.date_to}
                onChange={(e) => handleDateChange('date_to', e.target.value)}
                bg="primary.700"
                border="1px"
                borderColor="primary.600"
                color="white"
                w="140px"
                _focus={{ borderColor: 'accent.500' }}
                sx={{
                  '&::-webkit-calendar-picker-indicator': {
                    filter: 'invert(1)',
                    cursor: 'pointer',
                  },
                }}
              />
            </HStack>
          </HStack>

          {/* Selected group tags */}
          {filters.group_ids && filters.group_ids.length > 0 && (
            <Wrap spacing={2}>
              {filters.group_ids.map((gid) => {
                const group = groups.find(g => g.id === gid);
                return group ? (
                  <WrapItem key={gid}>
                    <Tag size="sm" bg="accent.500" color="white" borderRadius="full">
                      <TagLabel>{group.name}</TagLabel>
                      <TagCloseButton onClick={() => handleRemoveGroup(gid)} />
                    </Tag>
                  </WrapItem>
                ) : null;
              })}
            </Wrap>
          )}
        </VStack>
      </Collapse>
    </Box>
  );
};

export default FilterBar;
