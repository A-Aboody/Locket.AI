import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  IconButton,
  Button,
  Input,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertDescription,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { FiArrowLeft, FiSettings, FiUsers, FiMail, FiTrash2 } from 'react-icons/fi';
import AppHeader from '../custom_components/AppHeader';
import PageTransition from '../custom_components/PageTransition';
import { organizationsAPI, apiUtils, authAPI } from '../utils/api';
import { OrganizationMemberList, InviteCodeGenerator } from '../components/organization';
import EmailInviteManager from '../components/organization/EmailInviteManager';
import InviteList from '../components/organization/InviteList';

const OrganizationSettings = () => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [organization, setOrganization] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [inviteRefreshTrigger, setInviteRefreshTrigger] = useState(0);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const deleteCancelRef = useRef();

  const navigate = useNavigate();
  const toast = useToast();

  const handleDeleteOrganization = async () => {
    if (deleteConfirmName !== organization?.name) return;

    setIsDeleting(true);
    try {
      await organizationsAPI.delete(organization.id);

      // Clear org data from localStorage
      const updatedUser = { ...user, organization_id: null, org_role: null, organization_name: null };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast({
        title: 'Organization deleted',
        description: `${organization.name} has been permanently deleted`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      navigate('/');
    } catch (error) {
      const errorMsg = apiUtils.handleError(error, 'Failed to delete organization');
      toast({
        title: 'Error',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
      onDeleteClose();
    }
  };

  const handleInviteSent = () => {
    // Trigger refresh of invite list
    setInviteRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch fresh user data to get current org_role
      const userResponse = await authAPI.getCurrentUser();
      const freshUser = userResponse.data;
      localStorage.setItem('user', JSON.stringify(freshUser));
      setUser(freshUser);

      if (!freshUser?.organization_id) {
        setIsLoading(false);
        return;
      }

      const orgResponse = await organizationsAPI.getMy();
      setOrganization(orgResponse.data);
    } catch (error) {
      console.error('Failed to load organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organization details',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  // Not in an organization
  if (!user.organization_id) {
    return (
      <Box minH="100vh" bg="background.primary">
        <AppHeader user={user} />
        <Box h="calc(100vh - 73px)" overflowY="auto">
          <PageTransition>
            <Container maxW="container.lg" py={8} px={8}>
              <HStack mb={6} spacing={3}>
                <IconButton
                  icon={<FiArrowLeft />}
                  onClick={() => navigate(-1)}
                  aria-label="Go back"
                  variant="ghost"
                  color="gray.500"
                  size="sm"
                  rounded="md"
                  _hover={{
                    bg: 'primary.700',
                    color: 'white',
                  }}
                />
                <Text fontSize="xl" fontWeight="600" color="white" letterSpacing="-0.01em">
                  Organization Settings
                </Text>
              </HStack>

              <Alert
                status="info"
                borderRadius="md"
                bg="blue.900"
                borderWidth="1px"
                borderColor="blue.700"
              >
                <AlertIcon color="blue.300" />
                <AlertDescription color="gray.300">
                  You are not a member of any organization. Create or join an organization to access
                  team collaboration features.
                </AlertDescription>
              </Alert>
            </Container>
          </PageTransition>
        </Box>
      </Box>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Box minH="100vh" bg="background.primary">
        <AppHeader user={user} />
        <Box h="calc(100vh - 73px)" overflowY="auto">
          <Center h="full">
            <VStack spacing={4}>
              <Spinner size="xl" color="accent.500" thickness="3px" />
              <Text color="gray.400">Loading organization...</Text>
            </VStack>
          </Center>
        </Box>
      </Box>
    );
  }

  // Check if user has admin permissions
  const canManageOrganization = apiUtils.canPerformOrgAction('update_organization', user, organization);
  const canManageMembers = apiUtils.canPerformOrgAction('promote_member', user, organization);
  const canViewInvites = apiUtils.canPerformOrgAction('view_invites', user, organization);
  const canDeleteOrganization = apiUtils.canPerformOrgAction('delete_organization', user, organization);

  return (
    <Box minH="100vh" bg="background.primary">
      <AppHeader user={user} />

      <Box h="calc(100vh - 73px)" overflowY="auto">
        <PageTransition>
          <Container maxW="container.xl" py={8} px={8}>
            {/* Header */}
            <HStack mb={6} spacing={3}>
              <IconButton
                icon={<FiArrowLeft />}
                onClick={() => navigate(-1)}
                aria-label="Go back"
                variant="ghost"
                color="gray.500"
                size="sm"
                rounded="md"
                _hover={{
                  bg: 'primary.700',
                  color: 'white',
                }}
              />
              <Text fontSize="xl" fontWeight="600" color="white" letterSpacing="-0.01em">
                {organization?.name || 'Organization'} Settings
              </Text>
            </HStack>

            {/* Tabs */}
            <Tabs
              index={tabIndex}
              onChange={setTabIndex}
              variant="soft-rounded"
              colorScheme="accent"
            >
              <TabList
                mb={6}
                bg="primary.800"
                p={2}
                borderRadius="lg"
                borderWidth="1px"
                borderColor="primary.600"
                overflowX="auto"
                css={{
                  '&::-webkit-scrollbar': {
                    height: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#2e3238',
                    borderRadius: '3px',
                  },
                }}
              >
                {canManageOrganization && (
                  <Tab
                    color="gray.400"
                    _selected={{
                      color: 'white',
                      bg: 'accent.500',
                    }}
                    fontWeight="500"
                    fontSize="sm"
                  >
                    <HStack spacing={2}>
                      <FiSettings />
                      <Text>General</Text>
                    </HStack>
                  </Tab>
                )}
                <Tab
                  color="gray.400"
                  _selected={{
                    color: 'white',
                    bg: 'accent.500',
                  }}
                  fontWeight="500"
                  fontSize="sm"
                >
                  <HStack spacing={2}>
                    <FiUsers />
                    <Text>Members</Text>
                  </HStack>
                </Tab>
                {canViewInvites && (
                  <Tab
                    color="gray.400"
                    _selected={{
                      color: 'white',
                      bg: 'accent.500',
                    }}
                    fontWeight="500"
                    fontSize="sm"
                  >
                    <HStack spacing={2}>
                      <FiMail />
                      <Text>Invitations</Text>
                    </HStack>
                  </Tab>
                )}
              </TabList>

              <TabPanels>
                {/* General Settings Tab */}
                {canManageOrganization && (
                  <TabPanel px={0}>
                    <VStack spacing={6} align="stretch">
                      <Box
                        bg="primary.800"
                        borderWidth="1px"
                        borderColor="primary.600"
                        borderRadius="md"
                        p={6}
                      >
                        <Text color="white" fontSize="lg" fontWeight="600" mb={4}>
                          General Settings
                        </Text>
                        <VStack spacing={4} align="stretch">
                          <Box>
                            <Text color="gray.300" fontSize="sm" fontWeight="500" mb={2}>
                              Organization Name
                            </Text>
                            <Text color="white" fontSize="md">
                              {organization?.name}
                            </Text>
                          </Box>
                          {organization?.description && (
                            <Box>
                              <Text color="gray.300" fontSize="sm" fontWeight="500" mb={2}>
                                Description
                              </Text>
                              <Text color="white" fontSize="md">
                                {organization.description}
                              </Text>
                            </Box>
                          )}
                          <Box>
                            <Text color="gray.300" fontSize="sm" fontWeight="500" mb={2}>
                              Created
                            </Text>
                            <Text color="white" fontSize="md">
                              {new Date(organization?.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </Text>
                          </Box>
                        </VStack>
                      </Box>

                      {/* Danger Zone */}
                      {canDeleteOrganization && (
                        <Box
                          bg="primary.800"
                          borderWidth="1px"
                          borderColor="red.700"
                          borderRadius="md"
                          p={6}
                        >
                          <Text color="red.400" fontSize="lg" fontWeight="600" mb={2}>
                            Danger Zone
                          </Text>
                          <Text color="gray.400" fontSize="sm" mb={4}>
                            Deleting an organization is permanent and cannot be undone. All members will be removed.
                          </Text>
                          <Button
                            colorScheme="red"
                            variant="outline"
                            leftIcon={<FiTrash2 />}
                            onClick={onDeleteOpen}
                            size="sm"
                          >
                            Delete Organization
                          </Button>
                        </Box>
                      )}
                    </VStack>
                  </TabPanel>
                )}

                {/* Members Tab */}
                <TabPanel px={0}>
                  <OrganizationMemberList
                    organization={organization}
                    currentUser={user}
                    onMemberUpdate={loadData}
                  />
                </TabPanel>

                {/* Invitations Tab */}
                {canViewInvites && (
                  <TabPanel px={0}>
                    <VStack spacing={6} align="stretch">
                      {/* Email Invitation Form */}
                      <EmailInviteManager
                        organization={organization}
                        onInviteSent={handleInviteSent}
                      />

                      {/* Invitation List */}
                      <InviteList
                        organization={organization}
                        refreshTrigger={inviteRefreshTrigger}
                      />

                      {/* Code-based Invites (existing component) */}
                      <InviteCodeGenerator organization={organization} />
                    </VStack>
                  </TabPanel>
                )}
              </TabPanels>
            </Tabs>
          </Container>
        </PageTransition>
      </Box>

      {/* Delete Organization Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={deleteCancelRef}
        onClose={() => {
          onDeleteClose();
          setDeleteConfirmName('');
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="primary.800" borderColor="red.700" borderWidth="1px">
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
              Delete Organization
            </AlertDialogHeader>

            <AlertDialogBody>
              <VStack spacing={4} align="stretch">
                <Text color="gray.300">
                  This action is <Text as="span" color="red.400" fontWeight="bold">permanent</Text> and cannot be undone.
                  All members will be removed from the organization.
                </Text>
                <Text color="gray.300" fontSize="sm">
                  Type <Text as="span" color="white" fontWeight="bold">{organization?.name}</Text> to confirm:
                </Text>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Organization name"
                  bg="primary.700"
                  borderColor="primary.600"
                  color="white"
                  _hover={{ borderColor: 'primary.500' }}
                  _focus={{ borderColor: 'red.500', boxShadow: '0 0 0 1px var(--chakra-colors-red-500)' }}
                />
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={deleteCancelRef}
                onClick={() => {
                  onDeleteClose();
                  setDeleteConfirmName('');
                }}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteOrganization}
                ml={3}
                isLoading={isDeleting}
                isDisabled={deleteConfirmName !== organization?.name}
              >
                Delete Organization
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default OrganizationSettings;
