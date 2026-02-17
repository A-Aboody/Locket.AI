import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Divider,
} from '@chakra-ui/react';
import {
  FiEye,
  FiDownload,
  FiEdit2,
  FiCopy,
  FiTrash2,
  FiUserPlus,
  FiFolder,
  FiChevronRight,
  FiPlus,
  FiRotateCcw,
} from 'react-icons/fi';

const MenuItem = ({ icon, label, onClick, color = 'gray.200', hoverColor, danger, children, onMouseEnter, onMouseLeave }) => {
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

const SubMenu = ({ items, onSelect, visible, parentRef }) => {
  const [position, setPosition] = useState({ left: '100%', top: 0 });
  const subMenuRef = useRef(null);

  useEffect(() => {
    if (visible && subMenuRef.current) {
      const rect = subMenuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // If submenu would overflow right, show on left
      if (rect.right > viewportWidth - 10) {
        setPosition({ right: '100%', left: 'auto', top: 0 });
      }
    }
  }, [visible]);

  if (!visible || !items || items.length === 0) return null;

  return (
    <Box
      ref={subMenuRef}
      position="absolute"
      top={position.top}
      left={position.left}
      right={position.right}
      ml={position.left === '100%' ? 1 : 0}
      mr={position.right === '100%' ? 1 : 0}
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

const ContextMenu = ({
  position,
  document: doc,
  isVisible,
  onClose,
  onView,
  onDownload,
  onRename,
  onCopy,
  onDelete,
  onAddToGroup,
  onCreateGroup,
  onMoveToFolder,
  onRestore,
  onDeleteForever,
  groups = [],
  folders = [],
  canDelete = true,
  canAddToGroup = true,
  isTrash = false,
}) => {
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  useEffect(() => {
    if (isVisible && position) {
      const menuWidth = 220;
      const menuHeight = 320;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      if (x + menuWidth > viewportWidth - 10) {
        x = viewportWidth - menuWidth - 10;
      }
      if (y + menuHeight > viewportHeight - 10) {
        y = viewportHeight - menuHeight - 10;
      }
      if (x < 10) x = 10;
      if (y < 10) y = 10;

      setMenuPos({ x, y });
    }
  }, [isVisible, position]);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

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

  if (!isVisible || !doc) return null;

  const handleAction = (action) => {
    action();
    onClose();
  };

  // Build group submenu items with "Create new group" option
  const groupSubmenuItems = [
    ...groups.map(g => ({ ...g, icon: FiUserPlus })),
    ...(onCreateGroup ? [{ id: '__create__', name: ' Create new group', icon: FiPlus }] : []),
  ];

  const handleGroupSelect = (group) => {
    if (group.id === '__create__') {
      handleAction(() => onCreateGroup(doc));
    } else {
      handleAction(() => onAddToGroup(doc, group.id));
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
    >
      <VStack spacing={0} align="stretch">
        {/* Document name header */}
        <Box px={3} py={2} borderBottom="1px" borderColor="primary.600" mb={1}>
          <Text fontSize="xs" color="gray.500" noOfLines={1}>
            {doc.filename}
          </Text>
        </Box>

        {isTrash ? (
          <>
            <MenuItem
              icon={FiRotateCcw}
              label="Restore"
              onClick={() => handleAction(() => onRestore(doc.id, doc.filename))}
            />
            <Divider borderColor="primary.600" my={1} />
            <MenuItem
              icon={FiTrash2}
              label="Delete forever"
              danger
              onClick={() => handleAction(() => onDeleteForever(doc.id, doc.filename))}
            />
          </>
        ) : (
          <>
            <MenuItem
              icon={FiEye}
              label="View"
              onClick={() => handleAction(() => onView(doc.id))}
            />
            <MenuItem
              icon={FiDownload}
              label="Download"
              onClick={() => handleAction(() => onDownload(doc.id))}
            />

            <Divider borderColor="primary.600" my={1} />

            <MenuItem
              icon={FiEdit2}
              label="Rename"
              onClick={() => handleAction(() => onRename(doc))}
            />
            <MenuItem
              icon={FiCopy}
              label="Make a copy"
              onClick={() => handleAction(() => onCopy(doc.id))}
            />

            {(folders.length > 0 || onMoveToFolder) && (
              <MenuItem
                icon={FiFolder}
                label="Move to folder"
                onMouseEnter={() => setActiveSubmenu('folders')}
                onMouseLeave={() => setActiveSubmenu(null)}
              >
                <SubMenu
                  items={[
                    { id: null, name: 'Root (no folder)', icon: FiFolder },
                    ...folders,
                  ]}
                  onSelect={(folder) => handleAction(() => onMoveToFolder(doc.id, folder.id))}
                  visible={activeSubmenu === 'folders'}
                />
              </MenuItem>
            )}

            {canAddToGroup && (
              <MenuItem
                icon={FiUserPlus}
                label="Add to group"
                onMouseEnter={() => setActiveSubmenu('groups')}
                onMouseLeave={() => setActiveSubmenu(null)}
              >
                <SubMenu
                  items={groupSubmenuItems}
                  onSelect={handleGroupSelect}
                  visible={activeSubmenu === 'groups'}
                />
              </MenuItem>
            )}

            {canDelete && (
              <>
                <Divider borderColor="primary.600" my={1} />
                <MenuItem
                  icon={FiTrash2}
                  label="Move to trash"
                  danger
                  onClick={() => handleAction(() => onDelete(doc.id, doc.filename))}
                />
              </>
            )}
          </>
        )}
      </VStack>
    </Box>
  );

  return createPortal(menuContent, document.body);
};

export default ContextMenu;
