import {
  SimpleGrid,
  Card,
  CardBody,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Box,
} from '@chakra-ui/react';
import { FiEyeOff, FiGlobe, FiUsers, FiCheck } from 'react-icons/fi';

const VisibilitySelector = ({ 
  visibility, 
  selectedGroup, 
  uploading, 
  onVisibilityChange,
  onGroupSelect 
}) => {
  const visibilityOptions = [
    {
      value: 'private',
      icon: FiEyeOff,
      color: 'gray',
      title: 'Private',
      description: 'Only you can access this document',
    },
    {
      value: 'public',
      icon: FiGlobe,
      color: 'green',
      title: 'Public',
      description: 'All users can access this document',
    },
    {
      value: 'group',
      icon: FiUsers,
      color: 'accent',
      title: 'Group',
      description: selectedGroup 
        ? `Shared with ${selectedGroup.name}`
        : 'Share with specific group members',
    },
  ];

  return (
    <Box>
      <HStack mb={3} spacing={2}>
        <Box 
          w={6} 
          h={6} 
          rounded="full" 
          bg={visibility ? 'accent.500' : 'primary.700'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="xs"
          fontWeight="bold"
          color="white"
          transition="all 0.3s"
        >
          {visibility ? <FiCheck size={14} /> : '2'}
        </Box>
        <Text color="gray.300" fontWeight="medium">
          Choose Visibility
        </Text>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        {visibilityOptions.map((option) => {
          const isSelected = visibility === option.value;
          
          return (
            <Card
              key={option.value}
              bg={isSelected ? 'accent.500' : 'primary.800'}
              border="2px"
              borderColor={isSelected ? 'accent.400' : 'primary.600'}
              cursor={uploading ? 'not-allowed' : 'pointer'}
              onClick={() => !uploading && onVisibilityChange(option.value)}
              _hover={!uploading ? { 
                borderColor: isSelected ? 'accent.300' : 'primary.500',
                transform: 'translateY(-2px)',
              } : {}}
              transition="all 0.2s"
              position="relative"
              opacity={uploading ? 0.6 : 1}
            >
              <CardBody p={4}>
                <VStack align="start" spacing={2}>
                  <HStack justify="space-between" w="full">
                    <Box 
                      p={2} 
                      bg={isSelected ? 'whiteAlpha.200' : `${option.color}.500`}
                      rounded="lg"
                    >
                      <Icon 
                        as={option.icon} 
                        boxSize={5} 
                        color={isSelected ? 'white' : `${option.color}.100`}
                      />
                    </Box>
                    {isSelected && (
                      <Box 
                        p={1} 
                        bg="white" 
                        rounded="full"
                      >
                        <FiCheck color="#48BB78" size={12} />
                      </Box>
                    )}
                  </HStack>
                  <VStack align="start" spacing={1} w="full">
                    <HStack w="full" justify="space-between">
                      <Text 
                        color={isSelected ? 'white' : 'gray.100'} 
                        fontWeight="semibold"
                      >
                        {option.title}
                      </Text>
                      {option.value === 'group' && selectedGroup && (
                        <Badge 
                          colorScheme="white" 
                          fontSize="xs"
                          color="accent.500"
                          bg="white"
                        >
                          {selectedGroup.name}
                        </Badge>
                      )}
                    </HStack>
                    <Text 
                      color={isSelected ? 'whiteAlpha.800' : 'gray.400'} 
                      fontSize="xs"
                    >
                      {option.description}
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};

export default VisibilitySelector;