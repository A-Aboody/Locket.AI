import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, VStack, HStack, Text, Icon, Divider, useToast } from '@chakra-ui/react';
import { FiChevronRight, FiDownload, FiEdit2, FiTrash2, FiFolder, FiUserPlus, FiPlus } from 'react-icons/fi';

const clampPosition = (pos, menuWidth = 200, menuHeight = 340) => {
  if (!pos) return { x: 0, y: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = pos.x;
  let y = pos.y;
  if (x + menuWidth > vw - 10) x = vw - menuWidth - 10;
  if (y + menuHeight > vh - 10) y = vh - menuHeight - 10;
  if (x < 10) x = 10;
  if (y < 10) y = 10;
  return { x, y };
};

const MenuItem = ({ icon, label, onClick, color = 'gray.200', danger, children, onMouseEnter, onMouseLeave }) => {
  return (
    <Box
      position="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <HStack
        px={3}
        py={2}
        cursor="pointer"
        onClick={onClick}
        spacing={3}
        rounded="md"
        transition="background 0.1s"
        _hover={{ bg: danger ? 'red.900' : 'primary.600' }}
      >
        <Icon as={icon} boxSize={4} color={danger ? 'red.400' : 'gray.400'} />
        <Text fontSize="sm" color={danger ? 'red.400' : color} flex={1}>
          {label}
        </Text>
        {children && <Icon as={FiChevronRight} boxSize={3} color="gray.500" />}
      </HStack>
      {children}
    </Box>
  );
};

const SubMenu = ({ items, onSelect, visible, onMouseEnter, onMouseLeave }) => {
  const [flipLeft, setFlipLeft] = useState(false);
  const subMenuRef = useRef(null);

  useEffect(() => {
    if (subMenuRef.current) {
      const rect = subMenuRef.current.getBoundingClientRect();
      setFlipLeft(rect.right > window.innerWidth - 10);
    }
  }, [visible]);

  if (!items || items.length === 0) return null;

  return (
    <Box
      ref={subMenuRef}
      position="absolute"
      top={0}
      left={flipLeft ? 'auto' : '100%'}
      right={flipLeft ? '100%' : 'auto'}
      ml={flipLeft ? 0 : '2px'}
      mr={flipLeft ? '2px' : 0}
      bg="primary.700"
      border="1px"
      borderColor="primary.600"
      rounded="md"
      py={1}
      px={1}
      minW="160px"
      maxH="200px"
      overflowY="auto"
      zIndex={10001}
      boxShadow="lg"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.96)',
        transition: visible
          ? 'opacity 0.1s ease, transform 0.1s ease'
          : 'opacity 0.07s ease, transform 0.07s ease',
        pointerEvents: visible ? 'auto' : 'none',
        transformOrigin: flipLeft ? 'top right' : 'top left',
      }}
    >
      {items.map((item) => (
        <HStack
          key={item.id}
          px={3}
          py={2}
          cursor="pointer"
          onClick={() => onSelect(item)}
          rounded="md"
          _hover={{ bg: 'primary.600' }}
          spacing={2}
        >
          <Icon as={item.icon || FiFolder} boxSize={3} color="gray.400" />
          <Text fontSize="sm" color="gray.200" noOfLines={1}>
            {item.name}
          </Text>
        </HStack>
      ))}
    </Box>
  );
};

const FolderContextMenu = ({
  position,
  folder,
  isVisible,
  onClose,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  onMoveToFolder,
  onAddToGroup,
  onCreateGroup,
  folders = [],
  groups = [],
  canModify = true,
}) => {
  const menuRef = useRef(null);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const submenuTimerRef = useRef(null);
  const toast = useToast();

  // Persist last valid folder/position so content holds during fade-out.
  const lastFolderRef = useRef(folder);
  if (folder) lastFolderRef.current = folder;
  const displayFolder = folder || lastFolderRef.current;

  const lastPosRef = useRef(position);
  if (position) lastPosRef.current = position;
  const menuPos = clampPosition(position || lastPosRef.current);

  useEffect(() => {
    if (!isVisible) {
      clearTimeout(submenuTimerRef.current);
      setActiveSubmenu(null);
      return;
    }

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isVisible, onClose]);

  if (!displayFolder) return null;

  const handleSubmenuEnter = (name) => {
    clearTimeout(submenuTimerRef.current);
    setActiveSubmenu(name);
  };

  const handleSubmenuLeave = () => {
    submenuTimerRef.current = setTimeout(() => setActiveSubmenu(null), 120);
  };

  const handleAction = (action) => {
    action();
    onClose();
  };

  // Build folder submenu items — exclude the folder itself and ALL its descendants
  const getDescendantIds = (folderId, allFolders) => {
    const ids = new Set();
    const collect = (parentId) => {
      allFolders.forEach(f => {
        if (f.parent_id === parentId && !ids.has(f.id)) {
          ids.add(f.id);
          collect(f.id);
        }
      });
    };
    collect(folderId);
    return ids;
  };
  const descendantIds = getDescendantIds(displayFolder.id, folders);
  const folderSubmenuItems = [
    { id: null, name: 'Root (no parent)', icon: FiFolder },
    ...folders.filter(f => f.id !== displayFolder.id && !descendantIds.has(f.id)),
  ];

  // Build group submenu items
  const groupSubmenuItems = [
    ...groups.map(g => ({ ...g, icon: FiUserPlus })),
    ...(onCreateGroup ? [{ id: '__create__', name: ' Create new group', icon: FiPlus }] : []),
  ];

  const handleGroupSelect = (group) => {
    if (group.id === '__create__') {
      handleAction(() => onCreateGroup(displayFolder));
    } else {
      handleAction(() => onAddToGroup(displayFolder, group.id));
    }
  };

  const menuContent = (
    <Box
      ref={menuRef}
      position="fixed"
      left={`${menuPos.x}px`}
      top={`${menuPos.y}px`}
      bg="primary.700"
      border="1px"
      borderColor="primary.600"
      rounded="md"
      py={1}
      px={1}
      minW="200px"
      zIndex={10000}
      boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.96)',
        transition: isVisible
          ? 'opacity 0.12s ease, transform 0.12s ease'
          : 'opacity 0.08s ease, transform 0.08s ease',
        pointerEvents: isVisible ? 'auto' : 'none',
        transformOrigin: 'top left',
        willChange: 'opacity, transform',
      }}
    >
      <VStack spacing={0} align="stretch">
        <Box px={3} py={2} borderBottom="1px" borderColor="primary.600" mb={1}>
          <Text fontSize="xs" color="gray.500" noOfLines={1}>
            {displayFolder.name}
          </Text>
        </Box>

        <MenuItem
          icon={FiChevronRight}
          label="Open"
          onClick={() => handleAction(() => onOpen && onOpen(displayFolder.id))}
        />
        <MenuItem
          icon={FiDownload}
          label="Download as zip"
          onClick={() => handleAction(() => onDownload && onDownload(displayFolder))}
        />

        <Divider borderColor="primary.600" my={1} />

        {canModify && (
          <>
            <MenuItem
              icon={FiEdit2}
              label="Rename"
              onClick={() => handleAction(() => onRename && onRename(displayFolder))}
            />

            {(folderSubmenuItems.length > 0 && onMoveToFolder) && (
              <MenuItem
                icon={FiFolder}
                label="Move to folder"
                onMouseEnter={() => handleSubmenuEnter('folders')}
                onMouseLeave={handleSubmenuLeave}
              >
                <SubMenu
                  items={folderSubmenuItems}
                  onSelect={(targetFolder) => {
                    // Cross-scope validation: prevent moving group folders into non-group folders and vice versa
                    const targetFolderData = targetFolder.id ? folders.find(f => f.id === targetFolder.id) : null;
                    const sourceIsGroup = displayFolder.scope === 'organization' && displayFolder.group_id;
                    const targetIsGroup = targetFolderData?.scope === 'organization' && targetFolderData?.group_id;

                    if (sourceIsGroup && targetFolder.id !== null && !targetIsGroup) {
                      toast({
                        title: 'Cannot move group folder',
                        description: 'Group folders cannot be moved into private or organization folders. Make a copy and add it to the destination instead.',
                        status: 'warning',
                        duration: 6000,
                        isClosable: true,
                      });
                      onClose();
                      return;
                    }
                    if (!sourceIsGroup && targetIsGroup) {
                      toast({
                        title: 'Cannot move to group folder',
                        description: 'Private/organization folders cannot be moved into group folders. Make a copy and add it to the group instead.',
                        status: 'warning',
                        duration: 6000,
                        isClosable: true,
                      });
                      onClose();
                      return;
                    }
                    handleAction(() => onMoveToFolder(displayFolder.id, targetFolder.id));
                  }}
                  visible={activeSubmenu === 'folders'}
                  onMouseEnter={() => handleSubmenuEnter('folders')}
                  onMouseLeave={handleSubmenuLeave}
                />
              </MenuItem>
            )}

            {(groups.length > 0 || onCreateGroup) && onAddToGroup && (
              <MenuItem
                icon={FiUserPlus}
                label="Add to group"
                onMouseEnter={() => handleSubmenuEnter('groups')}
                onMouseLeave={handleSubmenuLeave}
              >
                <SubMenu
                  items={groupSubmenuItems}
                  onSelect={handleGroupSelect}
                  visible={activeSubmenu === 'groups'}
                  onMouseEnter={() => handleSubmenuEnter('groups')}
                  onMouseLeave={handleSubmenuLeave}
                />
              </MenuItem>
            )}

            <Divider borderColor="primary.600" my={1} />

            <MenuItem
              icon={FiTrash2}
              label="Delete"
              danger
              onClick={() => handleAction(() => onDelete && onDelete(displayFolder))}
            />
          </>
        )}
      </VStack>
    </Box>
  );

  return createPortal(menuContent, document.body);
};

export default FolderContextMenu;
