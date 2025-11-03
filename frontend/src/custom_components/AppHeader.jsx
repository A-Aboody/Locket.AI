import {
  Box,
  Heading,
  Text,
  HStack,
  Badge,
  Icon,
} from '@chakra-ui/react';
import { FiLock } from 'react-icons/fi';

const AppHeader = ({ user }) => {
  return (
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

        {user && (
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
        )}
      </HStack>
    </Box>
  );
};

export default AppHeader;