import {
  VStack,
  Center,
  Text,
  Box,
  Button,
  Spinner,
} from '@chakra-ui/react';
import { FiUsers, FiPlus } from 'react-icons/fi';
import GroupCard from './GroupCard';

const GroupsList = ({
  groups,
  groupStats,
  currentUserId,
  isLoading,
  onEdit,
  onDelete,
  onLeave,
  onAddMember,
  onRemoveMember,
  onCreateFirstGroup,
  onViewDocument,
}) => {
  const isGroupOwner = (group) => group.created_by_id === currentUserId;
  const isGroupMember = (group) => {
    return group.members?.some(member => member.user_id === currentUserId) || 
           group.created_by_id === currentUserId;
  };

  if (isLoading) {
    return (
      <Center py={20}>
        <VStack spacing={4}>
          <Spinner size="xl" color="accent.500" thickness="3px" />
          <Text color="gray.400">Loading your groups...</Text>
        </VStack>
      </Center>
    );
  }

  if (groups.length === 0) {
    return (
      <Center py={20} px={6}>
        <VStack spacing={4}>
          <Box 
            p={6} 
            bg="primary.800" 
            rounded="full"
            border="2px dashed"
            borderColor="primary.600"
          >
            <FiUsers size={48} color="#4A5568" />
          </Box>
          <Text color="white" fontSize="lg" fontWeight="medium">
            No Groups Yet
          </Text>
          <Text color="gray.400" textAlign="center" maxW="300px">
            Create your first group to start collaborating and sharing documents
          </Text>
          <Button
            colorScheme="accent"
            mt={2}
            onClick={onCreateFirstGroup}
            leftIcon={<FiPlus />}
            size="lg"
          >
            Create Your First Group
          </Button>
        </VStack>
      </Center>
    );
  }

  return (
    <VStack spacing={0} align="stretch">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          stats={groupStats[group.id]}
          isOwner={isGroupOwner(group)}
          isMember={isGroupMember(group)}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onDelete={onDelete}
          onLeave={onLeave}
          onAddMember={onAddMember}
          onRemoveMember={onRemoveMember}
          onViewDocument={onViewDocument}
        />
      ))}
    </VStack>
  );
};

export default GroupsList;