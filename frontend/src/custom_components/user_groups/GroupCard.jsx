import { useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  IconButton,
  Tooltip,
  Collapse,
  Divider,
  Input,
  Textarea,
  Button,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiEdit,
  FiTrash2,
  FiLogOut,
  FiChevronDown,
  FiChevronUp,
  FiSave,
  FiX,
  FiUser,
  FiFile,
  FiUserPlus,
} from 'react-icons/fi';
import MembersList from './MembersList';
import AddMemberForm from './AddMemberForm';
import GroupDocuments from './GroupDocuments';

const GroupCard = ({
  group,
  stats,
  isOwner,
  isMember,
  currentUserId,
  onEdit,
  onDelete,
  onLeave,
  onAddMember,
  onRemoveMember,
  onViewDocument,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDescription, setEditDescription] = useState(group.description || '');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const handleSaveEdit = () => {
    onEdit(group.id, editName, editDescription);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(group.name);
    setEditDescription(group.description || '');
    setIsEditing(false);
  };

  const handleAddMember = (userId) => {
    onAddMember(group.id, userId);
    setIsAddingMember(false);
  };

  return (
    <Box 
      borderBottom="1px"
      borderColor="primary.600"
      bg={isExpanded ? 'primary.800' : 'transparent'}
      transition="all 0.2s"
    >
      {/* Group Header */}
      <Box
        p={5}
        cursor="pointer"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
        _hover={{ bg: 'primary.800' }}
        transition="all 0.2s"
      >
        {isEditing ? (
          <VStack 
            spacing={3} 
            align="stretch"
            onClick={(e) => e.stopPropagation()}
          >
            <HStack>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Group name"
                color="white"
                bg="primary.700"
                size="md"
                autoFocus
                maxLength={50}
              />
              <IconButton
                icon={<FiSave />}
                colorScheme="accent"
                onClick={handleSaveEdit}
                aria-label="Save"
                isDisabled={!editName.trim()}
              />
              <IconButton
                icon={<FiX />}
                variant="ghost"
                onClick={handleCancelEdit}
                aria-label="Cancel"
                color="gray.400"
                _hover={{ color: 'white', bg: 'primary.600' }}
              />
            </HStack>
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description (optional)"
              color="white"
              bg="primary.700"
              size="sm"
              rows={2}
              resize="none"
            />
          </VStack>
        ) : (
          <HStack justify="space-between">
            <HStack spacing={4} flex={1}>
              <Box 
                p={3} 
                bg="accent.500" 
                rounded="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <FiUsers size={20} color="white" />
              </Box>
              <VStack align="start" spacing={1} flex={1}>
                <HStack>
                  <Text color="white" fontWeight="semibold" fontSize="lg">
                    {group.name}
                  </Text>
                  {isOwner && (
                    <Badge colorScheme="accent" fontSize="xs">
                      Owner
                    </Badge>
                  )}
                </HStack>
                {group.description && (
                  <Text color="gray.400" fontSize="sm" noOfLines={1}>
                    {group.description}
                  </Text>
                )}
                <HStack spacing={4} fontSize="xs" color="gray.500">
                  <HStack spacing={1}>
                    <FiUser size={12} />
                    <Text>{stats?.member_count || group.members?.length || 0} members</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <FiFile size={12} />
                    <Text>{stats?.document_count || 0} documents</Text>
                  </HStack>
                </HStack>
              </VStack>
            </HStack>
            
            <HStack spacing={2} onClick={(e) => e.stopPropagation()}>
              {isOwner && (
                <>
                  <Tooltip label="Edit group">
                    <IconButton
                      icon={<FiEdit />}
                      size="sm"
                      variant="ghost"
                      color="gray.400"
                      _hover={{ color: 'accent.400', bg: 'primary.700' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      aria-label="Edit group"
                    />
                  </Tooltip>
                  <Tooltip label="Delete group">
                    <IconButton
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="ghost"
                      color="gray.400"
                      _hover={{ color: 'red.400', bg: 'primary.700' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(group.id, group.name);
                      }}
                      aria-label="Delete group"
                    />
                  </Tooltip>
                </>
              )}
              {!isOwner && (
                <Tooltip label="Leave group">
                  <IconButton
                    icon={<FiLogOut />}
                    size="sm"
                    variant="ghost"
                    color="gray.400"
                    _hover={{ color: 'orange.400', bg: 'primary.700' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLeave(group.id, group.name);
                    }}
                    aria-label="Leave group"
                  />
                </Tooltip>
              )}
              <IconButton
                icon={isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                size="sm"
                variant="ghost"
                color="gray.400"
                aria-label={isExpanded ? "Collapse" : "Expand"}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              />
            </HStack>
          </HStack>
        )}
      </Box>

      {/* Expanded Content */}
      <Collapse in={isExpanded} animateOpacity>
        <Box px={5} pb={5}>
          <Divider borderColor="primary.600" mb={4} />
          
          {/* Members Section */}
          <Box mb={4}>
            <Text color="gray.300" fontSize="sm" fontWeight="medium" mb={3}>
              Members
            </Text>
            <MembersList
              members={group.members}
              ownerId={group.created_by_id}
              currentUserId={currentUserId}
              onRemoveMember={(userId, username) => onRemoveMember(group.id, userId, username)}
              isOwner={isOwner}
            />
          </Box>

          {/* Add Member Section */}
          {isMember && (
            <Box>
              {isAddingMember ? (
                <AddMemberForm
                  groupId={group.id}
                  onMemberAdded={handleAddMember}
                  onCancel={() => setIsAddingMember(false)}
                  existingMembers={group.members}
                />
              ) : (
                <Button
                  leftIcon={<FiUserPlus />}
                  size="sm"
                  variant="outline"
                  colorScheme="accent"
                  w="full"
                  onClick={() => setIsAddingMember(true)}
                >
                  Add Member
                </Button>
              )}
            </Box>
          )}

          {/* Documents Section */}
          <Box mt={6}>
            <Divider borderColor="primary.600" mb={4} />
            <GroupDocuments
              groupId={group.id}
              groupName={group.name}
              isOwner={isOwner}
              currentUserId={currentUserId}
              onViewDocument={onViewDocument}
            />
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export default GroupCard;