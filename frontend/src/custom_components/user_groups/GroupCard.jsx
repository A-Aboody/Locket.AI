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
  isOrgAdmin,
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
      bg="transparent"
      transition="all 0.15s"
      _last={{ borderBottom: 'none' }}
    >
      {/* Group Header */}
      <Box
        px={8}
        py={4}
        cursor="pointer"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
        _hover={{ bg: 'whiteAlpha.50' }}
        transition="all 0.15s"
        position="relative"
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
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1} flex={1}>
              <HStack spacing={2.5}>
                <Text color="white" fontWeight="600" fontSize="md" letterSpacing="-0.01em">
                  {group.name}
                </Text>
                {isOwner && (
                  <Badge
                    bg="primary.700"
                    color="gray.400"
                    fontSize="xs"
                    px={1.5}
                    py={0.5}
                    rounded="sm"
                    fontWeight="500"
                  >
                    Owner
                  </Badge>
                )}
                {isOrgAdmin && !isMember && (
                  <Badge
                    bg="blue.900"
                    color="blue.300"
                    fontSize="xs"
                    px={1.5}
                    py={0.5}
                    rounded="sm"
                    fontWeight="500"
                  >
                    Org Admin
                  </Badge>
                )}
              </HStack>
              {group.description && (
                <Text color="gray.500" fontSize="sm" noOfLines={1}>
                  {group.description}
                </Text>
              )}
              <HStack spacing={3} fontSize="xs" color="gray.500" mt={0.5}>
                <HStack spacing={1}>
                  <FiUser size={12} />
                  <Text>{stats?.member_count || group.members?.length || 0} members</Text>
                </HStack>
                <Text color="gray.600">•</Text>
                <HStack spacing={1}>
                  <FiFile size={12} />
                  <Text>{stats?.document_count || 0} documents</Text>
                </HStack>
              </HStack>
            </VStack>
            
            <HStack spacing={0.5} onClick={(e) => e.stopPropagation()}>
              {isOwner && (
                <>
                  <Tooltip label="Edit" placement="top">
                    <IconButton
                      icon={<FiEdit />}
                      size="sm"
                      variant="ghost"
                      color="gray.500"
                      rounded="md"
                      _hover={{ color: 'white', bg: 'primary.700' }}
                      transition="all 0.15s"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      aria-label="Edit group"
                    />
                  </Tooltip>
                  <Tooltip label="Delete" placement="top">
                    <IconButton
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="ghost"
                      color="gray.500"
                      rounded="md"
                      _hover={{ color: 'red.400', bg: 'primary.700' }}
                      transition="all 0.15s"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(group.id, group.name);
                      }}
                      aria-label="Delete group"
                    />
                  </Tooltip>
                </>
              )}
              {!isOwner && isMember && (
                <Tooltip label="Leave" placement="top">
                  <IconButton
                    icon={<FiLogOut />}
                    size="sm"
                    variant="ghost"
                    color="gray.500"
                    rounded="md"
                    _hover={{ color: 'orange.400', bg: 'primary.700' }}
                    transition="all 0.15s"
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
                color="gray.500"
                rounded="md"
                _hover={{ bg: 'primary.700' }}
                transition="all 0.15s"
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
        <Box px={8} pb={5} pt={1} bg="primary.800">
          {/* Members Section */}
          <Box mb={4}>
            <Text color="gray.400" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" mb={3}>
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
          {(isMember || isOrgAdmin) && (
            <Box mb={4}>
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
                  variant="ghost"
                  color="gray.400"
                  w="full"
                  justifyContent="flex-start"
                  fontWeight="500"
                  _hover={{
                    bg: 'primary.700',
                    color: 'white',
                  }}
                  transition="all 0.15s"
                  onClick={() => setIsAddingMember(true)}
                >
                  Add Member
                </Button>
              )}
            </Box>
          )}

          {/* Documents Section */}
          <Box pt={4} borderTop="1px" borderColor="primary.600">
            <Text color="gray.400" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" mb={3}>
              Documents
            </Text>
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