import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Icon,
  HStack,
  Text,
} from '@chakra-ui/react';
import { FiHome, FiChevronRight } from 'react-icons/fi';

const FolderBreadcrumb = ({ breadcrumb = [], onNavigate, rootLabel = 'Documents', onFolderContextMenu }) => {
  const handleContextMenu = (e, folder) => {
    if (onFolderContextMenu && folder) {
      e.preventDefault();
      e.stopPropagation();
      onFolderContextMenu(e, folder);
    }
  };

  return (
    <Breadcrumb
      separator={<Icon as={FiChevronRight} color="gray.600" boxSize={3} />}
      mb={3}
    >
      <BreadcrumbItem>
        <BreadcrumbLink
          onClick={() => onNavigate(null)}
          color={breadcrumb.length === 0 ? 'white' : 'gray.500'}
          fontWeight={breadcrumb.length === 0 ? 'medium' : 'normal'}
          fontSize="sm"
          _hover={{ color: 'accent.400', textDecoration: 'none' }}
          cursor="pointer"
        >
          <HStack spacing={1.5}>
            <Icon as={FiHome} boxSize={3} />
            <Text>{rootLabel}</Text>
          </HStack>
        </BreadcrumbLink>
      </BreadcrumbItem>

      {breadcrumb.map((folder, index) => {
        const isLast = index === breadcrumb.length - 1;
        return (
          <BreadcrumbItem key={folder.id} isCurrentPage={isLast}>
            <BreadcrumbLink
              onClick={() => !isLast && onNavigate(folder.id)}
              onContextMenu={(e) => handleContextMenu(e, folder)}
              color={isLast ? 'white' : 'gray.500'}
              fontWeight={isLast ? 'medium' : 'normal'}
              fontSize="sm"
              _hover={isLast ? {} : { color: 'accent.400', textDecoration: 'none' }}
              cursor={isLast ? 'default' : 'pointer'}
            >
              {folder.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
};

export default FolderBreadcrumb;
