import {
  Box,
  SimpleGrid,
  HStack,
  VStack,
  Text,
  Avatar,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FiUserMinus } from 'react-icons/fi';

const MembersList = ({ members, ownerId, currentUserId, onRemoveMember, isOwner }) => {
  if (!members || members.length === 0) {
    return (
      <Text color="gray.500" fontSize="sm" fontStyle="italic">
        No members yet
      </Text>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
      {members.map(member => (
        <Box
          key={member.user_id}
          p={3}
          bg="primary.700"
          rounded="md"
          border="1px"
          borderColor="primary.600"
        >
          <HStack justify="space-between">
            <HStack spacing={3}>
              <Avatar 
                name={member.username} 
                size="sm" 
                bg={member.user_id === ownerId ? "green.500" : "accent.500"}
              />
              <VStack align="start" spacing={0}>
                <Text color="white" fontSize="sm" fontWeight="medium">
                  {member.username}
                </Text>
                <Text 
                  color={member.user_id === ownerId ? "green.400" : "gray.400"} 
                  fontSize="xs"
                >
                  {member.user_id === ownerId ? 'Owner' : 'Member'}
                </Text>
              </VStack>
            </HStack>
            {isOwner && member.user_id !== currentUserId && (
              <Tooltip label="Remove member">
                <IconButton
                  icon={<FiUserMinus />}
                  size="xs"
                  variant="ghost"
                  color="gray.400"
                  _hover={{ color: 'red.400', bg: 'primary.600' }}
                  onClick={() => onRemoveMember(member.user_id, member.username)}
                  aria-label="Remove member"
                />
              </Tooltip>
            )}
          </HStack>
        </Box>
      ))}
    </SimpleGrid>
  );
};

export default MembersList;