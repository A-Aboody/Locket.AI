import {
  Box,
  Text,
  Wrap,
  WrapItem,
  HStack,
  Avatar,
  IconButton,
} from '@chakra-ui/react';
import { FiX } from 'react-icons/fi';

const SelectedMembersList = ({ members, onRemoveMember }) => {
  if (!members || members.length === 0) return null;

  return (
    <Box>
      <Text color="gray.400" fontSize="sm" mb={3}>
        Selected Members ({members.length})
      </Text>
      <Wrap spacing={2}>
        {members.map(member => (
          <WrapItem key={member.id}>
            <HStack
              bg="primary.700"
              px={3}
              py={2}
              rounded="full"
              spacing={2}
              border="1px"
              borderColor="primary.600"
            >
              <Avatar 
                name={member.username} 
                size="xs" 
                bg="accent.500"
              />
              <Text color="white" fontSize="sm">
                {member.username}
              </Text>
              <IconButton
                icon={<FiX />}
                size="xs"
                variant="ghost"
                color="gray.400"
                _hover={{ color: 'red.400', bg: 'primary.600' }}
                onClick={() => onRemoveMember(member.id)}
                aria-label="Remove member"
                rounded="full"
              />
            </HStack>
          </WrapItem>
        ))}
      </Wrap>
    </Box>
  );
};

export default SelectedMembersList;