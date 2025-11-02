import { useState } from 'react';
import {
  Box,
  IconButton,
  VStack,
  Button,
  useOutsideClick,
  Portal,
  ScaleFade,
} from '@chakra-ui/react';
import { FiMenu, FiUser, FiSettings, FiLogOut, FiUsers } from 'react-icons/fi';
import { useRef } from 'react';
import UserGroupsModal from './UserGroupsModal';

const FloatingMenu = ({ onProfile, onSettings, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserGroups, setShowUserGroups] = useState(false);
  const ref = useRef();

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
          <ScaleFade in={isOpen} initialScale={0.9}>
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
          </ScaleFade>

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
      />
    </>
  );
};

export default FloatingMenu;