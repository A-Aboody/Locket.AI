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
  currentUser,
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
  const isOrgAdmin = currentUser?.org_role === 'admin';

  if (isLoading) {
    return (
      <Center py={16}>
        <VStack spacing={3}>
          <Spinner size="lg" color="accent.500" thickness="2px" />
          <Text color="gray.500" fontSize="sm">Loading groups...</Text>
        </VStack>
      </Center>
    );
  }

  if (groups.length === 0) {
    return (
      <Center py={20} px={8}>
        <VStack spacing={4}>
          <Box color="gray.600">
            <FiUsers size={48} />
          </Box>
          <VStack spacing={1.5}>
            <Text color="white" fontSize="md" fontWeight="600">
              No groups yet
            </Text>
            <Text color="gray.500" textAlign="center" maxW="280px" fontSize="sm">
              Create a group to collaborate and share documents
            </Text>
          </VStack>
          <Button
            bg="accent.500"
            color="white"
            mt={2}
            onClick={onCreateFirstGroup}
            size="sm"
            rounded="md"
            fontWeight="500"
            _hover={{
              bg: 'accent.600',
            }}
            _active={{
              bg: 'accent.700',
            }}
            transition="all 0.15s"
          >
            Create Group
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
          isOrgAdmin={isOrgAdmin}
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