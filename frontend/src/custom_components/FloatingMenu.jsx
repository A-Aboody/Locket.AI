import { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  VStack,
  Button,
  useOutsideClick,
  Slide,
} from '@chakra-ui/react';
import { FiMenu, FiUser, FiSettings, FiLogOut, FiUsers } from 'react-icons/fi';
import { useRef } from 'react';
import UserGroupsModal from './UserGroupsModal';
import { canSwitchModes } from '../utils/modeUtils';

const FloatingMenu = ({ onProfile, onSettings, onLogout, onViewDocument }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserGroups, setShowUserGroups] = useState(false);
  const ref = useRef();

  // Check if user is in an organization (can manage groups)
  const userInOrganization = canSwitchModes();

  useOutsideClick({
    ref: ref,
    handler: () => setIsOpen(false),
  });

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleProfile = () => {
    setIsOpen(false);
    if (onProfile) onProfile();
  };

  const handleSettings = () => {
    setIsOpen(false);
    if (onSettings) onSettings();
  };

  const handleLogout = () => {
    setIsOpen(false);
    if (onLogout) onLogout();
  };

  const handleUserGroups = () => {
    setIsOpen(false);
    setShowUserGroups(true);
  };

  return (
    <>
      <Box ref={ref} position="fixed" bottom={6} left={6} zIndex={1000}>
        <Box position="relative">
          {/* Menu Items */}
          <Slide direction="bottom" in={isOpen} style={{ position: 'absolute' }}>
            <VStack
              spacing={2}
              position="absolute"
              bottom="70px"
              left="0"
              bg="primary.800"
              p={2}
              rounded="xl"
              shadow="2xl"
              border="1px"
              borderColor="primary.600"
              minW="150px"
              pointerEvents={isOpen ? 'auto' : 'none'}
              opacity={isOpen ? 1 : 0}
              transition="opacity 0.2s ease-in-out"
            >
              <Button
                leftIcon={<FiUser />}
                onClick={handleProfile}
                w="full"
                justifyContent="flex-start"
                variant="ghost"
                color="gray.200"
                _hover={{
                  bg: 'accent.500',
                  color: 'white',
                }}
              >
                Profile
              </Button>

              {/* Only show Manage Groups for users in an organization */}
              {userInOrganization && (
                <Button
                  leftIcon={<FiUsers />}
                  onClick={handleUserGroups}
                  w="full"
                  justifyContent="flex-start"
                  variant="ghost"
                  color="gray.200"
                  _hover={{
                    bg: 'accent.500',
                    color: 'white',
                  }}
                >
                  Manage Groups
                </Button>
              )}

              <Button
                leftIcon={<FiSettings />}
                onClick={handleSettings}
                w="full"
                justifyContent="flex-start"
                variant="ghost"
                color="gray.200"
                _hover={{
                  bg: 'accent.500',
                  color: 'white',
                }}
              >
                Settings
              </Button>

              <Button
                leftIcon={<FiLogOut />}
                onClick={handleLogout}
                w="full"
                justifyContent="flex-start"
                variant="ghost"
                color="red.400"
                _hover={{
                  bg: 'red.500',
                  color: 'white',
                }}
              >
                Logout
              </Button>
            </VStack>
          </Slide>

          {/* Main Burger Button */}
          <IconButton
            icon={<FiMenu />}
            onClick={toggleMenu}
            size="lg"
            rounded="full"
            bg="accent.500"
            color="white"
            shadow="xl"
            _hover={{
              bg: 'accent.600',
              transform: 'scale(1.05)',
            }}
            _active={{
              bg: 'accent.700',
              transform: 'scale(0.95)',
            }}
            transition="all 0.2s"
            aria-label="Menu"
          />
        </Box>
      </Box>

      {/* User Groups Modal */}
      <UserGroupsModal
        isOpen={showUserGroups}
        onClose={() => setShowUserGroups(false)}
        onViewDocument={onViewDocument}
      />
    </>
  );
};

export default FloatingMenu;