import { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  VStack,
  Button,
  useOutsideClick,
  Slide,
  Divider,
} from '@chakra-ui/react';
import { FiMenu, FiUser, FiSettings, FiLogOut, FiUsers, FiTrash2, FiFolder } from 'react-icons/fi';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import UserGroupsModal from './UserGroupsModal';
import FoldersModal from './FoldersModal';
import { canSwitchModes, getUserMode } from '../utils/modeUtils';

const FloatingMenu = ({ onProfile, onSettings, onLogout, onViewDocument }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserGroups, setShowUserGroups] = useState(false);
  const [showFolders, setShowFolders] = useState(false);
  const ref = useRef();
  const navigate = useNavigate();

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

  const handleTrash = () => {
    setIsOpen(false);
    navigate('/trash');
  };

  const handleFolders = () => {
    setIsOpen(false);
    setShowFolders(true);
  };

  return (
    <>
      <Box ref={ref} position="fixed" bottom={6} left={6} zIndex={1000}>
        <Box position="relative">
          {/* Menu Items */}
          <Slide direction="bottom" in={isOpen} style={{ position: 'absolute' }}>
            <VStack
              spacing={1}
              position="absolute"
              bottom="70px"
              left="0"
              bg="primary.800"
              p={2}
              rounded="xl"
              shadow="2xl"
              border="1px"
              borderColor="primary.600"
              minW="170px"
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
                size="sm"
                _hover={{
                  bg: 'accent.500',
                  color: 'white',
                }}
              >
                Profile
              </Button>

              <Button
                leftIcon={<FiFolder />}
                onClick={handleFolders}
                w="full"
                justifyContent="flex-start"
                variant="ghost"
                color="gray.200"
                size="sm"
                _hover={{
                  bg: 'accent.500',
                  color: 'white',
                }}
              >
                Folders
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
                  size="sm"
                  _hover={{
                    bg: 'accent.500',
                    color: 'white',
                  }}
                >
                  Manage Groups
                </Button>
              )}

              <Button
                leftIcon={<FiTrash2 />}
                onClick={handleTrash}
                w="full"
                justifyContent="flex-start"
                variant="ghost"
                color="gray.200"
                size="sm"
                _hover={{
                  bg: 'accent.500',
                  color: 'white',
                }}
              >
                Trash
              </Button>

              <Divider borderColor="primary.600" />

              <Button
                leftIcon={<FiSettings />}
                onClick={handleSettings}
                w="full"
                justifyContent="flex-start"
                variant="ghost"
                color="gray.200"
                size="sm"
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
                size="sm"
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

      {/* Folders Modal */}
      <FoldersModal
        isOpen={showFolders}
        onClose={() => setShowFolders(false)}
        onSelectFolder={(folderId, folderName) => {
          // Dispatch event so the current page can handle it directly if already mounted
          window.dispatchEvent(new CustomEvent('navigateToFolder', { detail: { folderId, folderName } }));
          // Navigate to the documents page with the folder pre-selected
          navigate('/documents', { state: { selectedFolderId: folderId, selectedFolderName: folderName } });
          setShowFolders(false);
        }}
        onViewDocument={onViewDocument}
        mode={getUserMode()}
      />
    </>
  );
};

export default FloatingMenu;