import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  VStack,
  Button,
  Icon,
  IconButton,
  Input,
  Textarea,
  useToast,
  Flex,
  Divider,
  Badge,
  Tooltip,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Avatar,
  Link,
  Card,
  CardBody,
} from '@chakra-ui/react';
import {
  FiMessageSquare,
  FiPlus,
  FiSend,
  FiEdit2,
  FiTrash2,
  FiArchive,
  FiMoreVertical,
  FiFile,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
  FiBookOpen,
} from 'react-icons/fi';
import AppHeader from '../custom_components/AppHeader';
import NavTabs from '../custom_components/NavTabs';
import { chatsAPI, apiUtils } from '../utils/api';

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const messagesEndRef = useRef(null);

  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCitationsPanelOpen, setIsCitationsPanelOpen] = useState(true);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const { isOpen: isRenameOpen, onOpen: onRenameOpen, onClose: onRenameClose } = useDisclosure();
  const [renameValue, setRenameValue] = useState('');
  const [renamingChatId, setRenamingChatId] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      loadChats();
    }
  }, []);

  useEffect(() => {
    if (chatId && parseInt(chatId) !== currentChat?.id) {
      loadChat(parseInt(chatId));
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChats = async () => {
    try {
      setIsLoadingChats(true);
      const response = await chatsAPI.list({ include_archived: false });
      setChats(response.data.chats || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
      toast({
        title: 'Error loading chats',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoadingChats(false);
    }
  };

  const loadChat = async (id) => {
    try {
      setIsLoadingMessages(true);
      const response = await chatsAPI.get(id);
      setCurrentChat(response.data);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load chat:', error);
      toast({
        title: 'Error loading chat',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const createNewChat = async () => {
    try {
      const response = await chatsAPI.create({ title: null });
      const newChat = response.data;

      // Update state without reload
      setChats(prevChats => [newChat, ...prevChats]);
      navigate(`/chat/${newChat.id}`, { replace: true });

      toast({
        title: 'New chat created',
        status: 'success',
        duration: 1000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast({
        title: 'Error creating chat',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Typing effect function - word-by-word for proper formatting
  const typeMessage = useCallback((fullMessage, callback) => {
    setIsStreaming(true);
    setStreamingMessage('');

    const words = fullMessage.split(' ');
    let currentIndex = 0;

    const typeInterval = setInterval(() => {
      if (currentIndex < words.length) {
        setStreamingMessage(prev => {
          const newText = prev + (currentIndex > 0 ? ' ' : '') + words[currentIndex];
          return newText;
        });
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setIsStreaming(false);
        setStreamingMessage('');
        if (callback) callback();
      }
    }, 30); // Speed of typing (30ms per word for smooth effect)

    return () => clearInterval(typeInterval);
  }, []);

  const sendMessage = async () => {
    if (!messageInput.trim() || !currentChat) return;

    const userMessage = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    // Optimistically add user message to UI
    const tempUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
      citations: []
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await chatsAPI.sendMessage(currentChat.id, userMessage);

      // Remove temp user message and add AI response with typing effect
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));

      // Add user message immediately
      const userMsg = {
        id: response.data.id - 1,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString(),
        citations: []
      };

      setMessages(prev => [...prev, userMsg]);

      // Type the AI response
      typeMessage(response.data.content, () => {
        // After typing is complete, add the actual message
        setMessages(prev => [...prev, response.data]);

        // Update chat in list silently (no reload)
        setChats(prevChats => {
          const updatedChats = prevChats.map(c =>
            c.id === currentChat.id
              ? {
                  ...c,
                  message_count: (c.message_count || 0) + 2,
                  last_message_preview: response.data.content.substring(0, 100),
                  last_message_at: response.data.created_at,
                  updated_at: new Date().toISOString()
                }
              : c
          );
          return updatedChats.sort((a, b) =>
            new Date(b.updated_at) - new Date(a.updated_at)
          );
        });

        setCurrentChat(prev => ({
          ...prev,
          message_count: (prev.message_count || 0) + 2
        }));
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
      toast({
        title: 'Error sending message',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      // Restore the message input
      setMessageInput(userMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const deleteChat = async (id) => {
    if (!window.confirm('Are you sure you want to delete this chat?')) return;

    try {
      await chatsAPI.delete(id);

      // Update state without page reload
      setChats(prevChats => prevChats.filter(chat => chat.id !== id));

      if (currentChat?.id === id) {
        setCurrentChat(null);
        setMessages([]);
        navigate('/chat', { replace: true });
      }

      toast({
        title: 'Chat deleted',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast({
        title: 'Error deleting chat',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const archiveChat = async (id) => {
    try {
      await chatsAPI.archive(id);

      // Update state without page reload
      setChats(prevChats => prevChats.filter(chat => chat.id !== id));

      if (currentChat?.id === id) {
        setCurrentChat(null);
        setMessages([]);
        navigate('/chat', { replace: true });
      }

      toast({
        title: 'Chat archived',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to archive chat:', error);
      toast({
        title: 'Error archiving chat',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const openRenameModal = (chat) => {
    setRenamingChatId(chat.id);
    setRenameValue(chat.title || '');
    onRenameOpen();
  };

  const renameChat = async () => {
    if (!renameValue.trim() || !renamingChatId) return;

    try {
      await chatsAPI.rename(renamingChatId, renameValue.trim());

      // Update local state without reload
      setChats(prevChats => prevChats.map(chat =>
        chat.id === renamingChatId ? { ...chat, title: renameValue.trim() } : chat
      ));

      if (currentChat?.id === renamingChatId) {
        setCurrentChat(prev => ({ ...prev, title: renameValue.trim() }));
      }

      onRenameClose();
      setRenameValue('');
      setRenamingChatId(null);

      toast({
        title: 'Chat renamed',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to rename chat:', error);
      toast({
        title: 'Error renaming chat',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  // Collect all citations from messages in the current chat
  const getAllCitations = () => {
    const citationsMap = new Map();

    messages.forEach((message) => {
      if (message.citations && message.citations.length > 0) {
        message.citations.forEach((citation) => {
          // Use document_id as key to avoid duplicates
          const key = citation.document_id || citation.id;
          if (!citationsMap.has(key)) {
            citationsMap.set(key, {
              ...citation,
              messageId: message.id,
              messageContent: message.content.substring(0, 100) + '...',
            });
          }
        });
      }
    });

    return Array.from(citationsMap.values());
  };

  return (
    <Box minH="100vh">
      <AppHeader
        user={user}
        onLogout={handleLogout}
        onSettings={handleSettings}
      />
      <NavTabs />

        <Container maxW="container.2xl" py={6}>
          <Flex gap={4} h="calc(100vh - 200px)">
            {/* Chat List Sidebar */}
            <Box
              w="300px"
              bg="primary.900"
              borderRadius="lg"
              shadow="lg"
              border="1px"
              borderColor="primary.700"
              p={4}
              overflowY="auto"
            >
              <VStack spacing={3} align="stretch">
                <Button
                  leftIcon={<FiPlus />}
                  colorScheme="accent"
                  onClick={createNewChat}
                  w="full"
                  bg="accent.500"
                  _hover={{ bg: 'accent.600' }}
                >
                  New Chat
                </Button>

                <Divider borderColor="primary.700" />

                {isLoadingChats ? (
                  <Flex justify="center" py={8}>
                    <Spinner color="accent.500" />
                  </Flex>
                ) : chats.length === 0 ? (
                  <Text textAlign="center" color="gray.400" py={8}>
                    No chats yet. Create one to get started!
                  </Text>
                ) : (
                  chats.map((chat) => (
                    <Card
                      key={chat.id}
                      variant="outline"
                      cursor="pointer"
                      onClick={() => navigate(`/chat/${chat.id}`)}
                      _hover={{ shadow: 'lg', borderColor: 'accent.400', bg: 'primary.800' }}
                      bg={currentChat?.id === chat.id ? 'primary.800' : 'primary.900'}
                      borderColor={currentChat?.id === chat.id ? 'accent.500' : 'primary.700'}
                      borderWidth="2px"
                    >
                      <CardBody p={3}>
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={1} flex={1}>
                            <Text fontWeight="medium" fontSize="sm" noOfLines={1} color="gray.100">
                              {chat.title || 'New Chat'}
                            </Text>
                            <Text fontSize="xs" color="gray.400" noOfLines={2}>
                              {chat.last_message_preview || 'No messages yet'}
                            </Text>
                            <HStack spacing={2}>
                              <Badge colorScheme="accent" fontSize="xx-small">
                                {chat.message_count} messages
                              </Badge>
                              {chat.last_message_at && (
                                <Text fontSize="xx-small" color="gray.500">
                                  {apiUtils.getRelativeTime(chat.last_message_at)}
                                </Text>
                              )}
                            </HStack>
                          </VStack>

                          <Menu>
                            <MenuButton
                              as={IconButton}
                              icon={<FiMoreVertical />}
                              size="xs"
                              variant="ghost"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <MenuList>
                              <MenuItem
                                icon={<FiEdit2 />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRenameModal(chat);
                                }}
                              >
                                Rename
                              </MenuItem>
                              <MenuItem
                                icon={<FiArchive />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveChat(chat.id);
                                }}
                              >
                                Archive
                              </MenuItem>
                              <MenuItem
                                icon={<FiTrash2 />}
                                color="red.500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteChat(chat.id);
                                }}
                              >
                                Delete
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </HStack>
                      </CardBody>
                    </Card>
                  ))
                )}
              </VStack>
            </Box>

            {/* Chat Messages Area */}
            <Flex
              flex={1}
              direction="column"
              bg="primary.900"
              borderRadius="lg"
              shadow="lg"
              border="1px"
              borderColor="primary.700"
              position="relative"
            >
              {!currentChat ? (
                <Flex
                  direction="column"
                  align="center"
                  justify="center"
                  h="full"
                  p={8}
                  color="gray.400"
                >
                  <Icon as={FiMessageSquare} boxSize={16} mb={4} color="accent.500" />
                  <Heading size="md" mb={2} color="gray.100">
                    Welcome to Locket Chat
                  </Heading>
                  <Text textAlign="center" mb={6}>
                    Ask questions about your uploaded documents and get instant answers
                    with citations.
                  </Text>
                  <Button
                    leftIcon={<FiPlus />}
                    colorScheme="accent"
                    onClick={createNewChat}
                    bg="accent.500"
                    _hover={{ bg: 'accent.600' }}
                  >
                    Start New Chat
                  </Button>
                </Flex>
              ) : (
                <>
                  {/* Chat Header */}
                  <Box p={4} borderBottom="1px" borderColor="primary.700">
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0}>
                        <Heading size="sm" color="gray.100">
                          {currentChat.title || 'New Chat'}
                        </Heading>
                        <Text fontSize="xs" color="gray.500">
                          {currentChat.message_count} messages
                        </Text>
                      </VStack>
                      <HStack spacing={2}>
                        {/* Citations Toggle Button */}
                        <Tooltip
                          label={isCitationsPanelOpen ? 'Hide Citations' : 'Show Citations'}
                          placement="bottom"
                        >
                          <Button
                            leftIcon={<FiBookOpen />}
                            size="sm"
                            variant={isCitationsPanelOpen ? 'solid' : 'outline'}
                            colorScheme="accent"
                            onClick={() => setIsCitationsPanelOpen(!isCitationsPanelOpen)}
                            bg={isCitationsPanelOpen ? 'accent.500' : 'transparent'}
                            borderColor="accent.500"
                            _hover={{
                              bg: isCitationsPanelOpen ? 'accent.600' : 'accent.900'
                            }}
                          >
                            Sources
                            {getAllCitations().length > 0 && (
                              <Badge
                                ml={2}
                                colorScheme="green"
                                borderRadius="full"
                                px={2}
                              >
                                {getAllCitations().length}
                              </Badge>
                            )}
                          </Button>
                        </Tooltip>

                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<FiMoreVertical />}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            <MenuItem
                              icon={<FiEdit2 />}
                              onClick={() => openRenameModal(currentChat)}
                            >
                              Rename Chat
                            </MenuItem>
                            <MenuItem
                              icon={<FiArchive />}
                              onClick={() => archiveChat(currentChat.id)}
                            >
                              Archive
                            </MenuItem>
                            <MenuItem
                              icon={<FiTrash2 />}
                              color="red.500"
                              onClick={() => deleteChat(currentChat.id)}
                            >
                              Delete Chat
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </HStack>
                    </HStack>
                  </Box>

                  {/* Messages */}
                  <Box flex={1} overflowY="auto" p={4} bg="primary.900">
                    {isLoadingMessages ? (
                      <Flex justify="center" align="center" h="full">
                        <Spinner size="lg" color="accent.500" />
                      </Flex>
                    ) : messages.length === 0 ? (
                      <Flex
                        direction="column"
                        align="center"
                        justify="center"
                        h="full"
                        color="gray.400"
                      >
                        <Icon as={FiMessageSquare} boxSize={12} mb={2} color="accent.500" />
                        <Text>No messages yet. Start the conversation!</Text>
                      </Flex>
                    ) : (
                      <VStack spacing={4} align="stretch">
                        {messages.map((message, index) => (
                          <Box key={message.id}>
                            <HStack align="start" spacing={3}>
                              <Avatar
                                size="sm"
                                name={message.role === 'user' ? user?.username : 'Locket'}
                                bg={message.role === 'user' ? 'accent.500' : 'primary.600'}
                                icon={message.role === 'assistant' ? <FiMessageSquare /> : <FiUser />}
                              />
                              <VStack align="start" flex={1} spacing={2}>
                                <HStack>
                                  <Text fontWeight="bold" fontSize="sm" color="gray.100">
                                    {message.role === 'user' ? user?.username : 'Locket'}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {apiUtils.getRelativeTime(message.created_at)}
                                  </Text>
                                </HStack>
                                <Box
                                  bg={message.role === 'user' ? 'primary.800' : 'primary.800'}
                                  p={3}
                                  borderRadius="md"
                                  w="full"
                                  border="1px"
                                  borderColor={message.role === 'user' ? 'accent.500' : 'primary.600'}
                                  sx={{
                                    '& p': { marginBottom: '0.5rem' },
                                    '& p:last-child': { marginBottom: 0 }
                                  }}
                                >
                                  <Text whiteSpace="pre-wrap" color="gray.100" lineHeight="1.6">
                                    {message.content}
                                  </Text>
                                </Box>

                                {/* Citations */}
                                {message.citations && message.citations.length > 0 && (
                                  <VStack align="start" spacing={2} w="full" mt={2}>
                                    <Text fontSize="sm" fontWeight="medium" color="accent.400">
                                      Sources:
                                    </Text>
                                    {message.citations.map((citation) => (
                                      <Card key={citation.id} size="sm" w="full" bg="primary.700" borderColor="primary.600">
                                        <CardBody p={3}>
                                          <HStack justify="space-between" mb={2}>
                                            <HStack>
                                              <Icon as={FiFile} color="accent.500" />
                                              <Link
                                                color="accent.400"
                                                fontWeight="medium"
                                                fontSize="sm"
                                                onClick={() => navigate(`/documents`)}
                                                _hover={{ color: 'accent.300' }}
                                              >
                                                {citation.document_filename}
                                              </Link>
                                            </HStack>
                                            {citation.relevance_score && (
                                              <Badge colorScheme="green">
                                                {citation.relevance_score}% relevant
                                              </Badge>
                                            )}
                                          </HStack>
                                          {citation.excerpt && (
                                            <Text fontSize="xs" color="gray.400" noOfLines={3}>
                                              "{citation.excerpt}"
                                            </Text>
                                          )}
                                        </CardBody>
                                      </Card>
                                    ))}
                                  </VStack>
                                )}
                              </VStack>
                            </HStack>
                          </Box>
                        ))}

                        {/* Streaming message (typing effect) */}
                        {isStreaming && streamingMessage && (
                          <Box>
                            <HStack align="start" spacing={3}>
                              <Avatar
                                size="sm"
                                name="Locket"
                                bg="primary.600"
                                icon={<FiMessageSquare />}
                              />
                              <VStack align="start" flex={1} spacing={2}>
                                <HStack>
                                  <Text fontWeight="bold" fontSize="sm" color="gray.100">
                                    Locket
                                  </Text>
                                  <Spinner size="xs" color="accent.500" />
                                </HStack>
                                <Box
                                  bg="primary.800"
                                  p={3}
                                  borderRadius="md"
                                  w="full"
                                  border="1px"
                                  borderColor="primary.600"
                                  sx={{
                                    '& p': { marginBottom: '0.5rem' },
                                    '& p:last-child': { marginBottom: 0 }
                                  }}
                                >
                                  <Text
                                    whiteSpace="pre-wrap"
                                    color="gray.100"
                                    lineHeight="1.6"
                                    sx={{
                                      wordBreak: 'break-word',
                                      overflowWrap: 'break-word'
                                    }}
                                  >
                                    {streamingMessage}
                                    <Box
                                      as="span"
                                      display="inline-block"
                                      w="2px"
                                      h="1em"
                                      bg="accent.500"
                                      ml={1}
                                      animation="blink 1s infinite"
                                      sx={{
                                        '@keyframes blink': {
                                          '0%, 49%': { opacity: 1 },
                                          '50%, 100%': { opacity: 0 },
                                        },
                                      }}
                                    />
                                  </Text>
                                </Box>
                              </VStack>
                            </HStack>
                          </Box>
                        )}

                        <div ref={messagesEndRef} />
                      </VStack>
                    )}
                  </Box>

                  {/* Message Input */}
                  <Box p={4} borderTop="1px" borderColor="primary.700" bg="primary.900">
                    <VStack spacing={2} align="stretch">
                      <HStack spacing={2} align="end">
                        <Textarea
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Ask Locket a question..."
                          size="md"
                          resize="vertical"
                          minH="40px"
                          maxH="150px"
                          disabled={isSending || isStreaming}
                          bg="primary.800"
                          color="gray.100"
                          border="1px"
                          borderColor="primary.600"
                          borderRadius="lg"
                          _placeholder={{ color: 'gray.500' }}
                          _hover={{ borderColor: 'primary.500' }}
                          _focus={{
                            borderColor: 'accent.500',
                            boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                            outline: 'none'
                          }}
                          _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
                          fontSize="sm"
                          py={3}
                          px={4}
                        />
                        <IconButton
                          icon={isSending || isStreaming ? <Spinner size="sm" /> : <FiSend />}
                          colorScheme="accent"
                          onClick={sendMessage}
                          isDisabled={!messageInput.trim() || isSending || isStreaming}
                          aria-label="Send message"
                          bg="accent.500"
                          _hover={{ bg: 'accent.600', transform: 'scale(1.05)' }}
                          _active={{ transform: 'scale(0.95)' }}
                          transition="all 0.2s"
                          size="lg"
                          borderRadius="lg"
                        />
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        Press Enter to send • Shift+Enter for new line
                      </Text>
                    </VStack>
                  </Box>
                </>
              )}
            </Flex>

            {/* Citations Panel - Collapsible */}
            {currentChat && (
              <Box
                w={isCitationsPanelOpen ? '350px' : '0'}
                transition="width 0.3s ease"
                overflow="hidden"
                position="relative"
              >
                <Flex
                  direction="column"
                  h="full"
                  bg="primary.900"
                  borderRadius="lg"
                  shadow="lg"
                  border="1px"
                  borderColor="primary.700"
                  ml={isCitationsPanelOpen ? 4 : 0}
                  transition="margin-left 0.3s ease"
                >
                  {/* Panel Header */}
                  <Box p={4} borderBottom="1px" borderColor="primary.700">
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FiBookOpen} color="accent.500" />
                        <Heading size="sm" color="gray.100">
                          Citations
                        </Heading>
                      </HStack>
                      <IconButton
                        icon={<FiChevronRight />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsCitationsPanelOpen(false)}
                        aria-label="Close citations panel"
                      />
                    </HStack>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {getAllCitations().length} source{getAllCitations().length !== 1 ? 's' : ''}
                    </Text>
                  </Box>

                  {/* Citations List */}
                  <Box flex={1} overflowY="auto" p={4}>
                    {getAllCitations().length === 0 ? (
                      <Flex
                        direction="column"
                        align="center"
                        justify="center"
                        h="full"
                        color="gray.400"
                      >
                        <Icon as={FiFile} boxSize={8} mb={2} color="accent.500" />
                        <Text textAlign="center" fontSize="sm">
                          No citations yet. Ask a question to see sources!
                        </Text>
                      </Flex>
                    ) : (
                      <VStack spacing={3} align="stretch">
                        {getAllCitations().map((citation, index) => (
                          <Card
                            key={citation.id || index}
                            size="sm"
                            bg="primary.800"
                            borderColor="primary.600"
                            _hover={{ borderColor: 'accent.500', shadow: 'md' }}
                            cursor="pointer"
                            onClick={() => navigate(`/documents`)}
                          >
                            <CardBody p={3}>
                              <VStack align="start" spacing={2}>
                                <HStack justify="space-between" w="full">
                                  <HStack spacing={2}>
                                    <Icon as={FiFile} color="accent.500" boxSize={4} />
                                    <Text
                                      fontWeight="medium"
                                      fontSize="sm"
                                      color="accent.400"
                                      noOfLines={1}
                                    >
                                      {citation.document_filename}
                                    </Text>
                                  </HStack>
                                  {citation.relevance_score && (
                                    <Badge colorScheme="green" fontSize="xx-small">
                                      {citation.relevance_score}%
                                    </Badge>
                                  )}
                                </HStack>
                                {citation.excerpt && (
                                  <Text fontSize="xs" color="gray.400" noOfLines={3}>
                                    "{citation.excerpt}"
                                  </Text>
                                )}
                                <Text fontSize="xx-small" color="gray.600">
                                  Used in response
                                </Text>
                              </VStack>
                            </CardBody>
                          </Card>
                        ))}
                      </VStack>
                    )}
                  </Box>
                </Flex>

                {/* Toggle Button (When Panel is Open) */}
                <IconButton
                  icon={<FiChevronRight />}
                  size="sm"
                  variant="solid"
                  colorScheme="accent"
                  position="absolute"
                  left="-12px"
                  top="50%"
                  transform="translateY(-50%)"
                  onClick={() => setIsCitationsPanelOpen(false)}
                  aria-label="Collapse citations"
                  zIndex={2}
                  bg="accent.500"
                  _hover={{ bg: 'accent.600' }}
                  display={isCitationsPanelOpen ? 'flex' : 'none'}
                />
              </Box>
            )}

            {/* Toggle Button (When Panel is Closed) */}
            {currentChat && !isCitationsPanelOpen && (
              <IconButton
                icon={<FiChevronLeft />}
                size="sm"
                variant="solid"
                colorScheme="accent"
                position="fixed"
                right="20px"
                top="50%"
                transform="translateY(-50%)"
                onClick={() => setIsCitationsPanelOpen(true)}
                aria-label="Open citations"
                zIndex={10}
                bg="accent.500"
                _hover={{ bg: 'accent.600' }}
              />
            )}
          </Flex>
        </Container>

      {/* Rename Modal */}
      <Modal isOpen={isRenameOpen} onClose={onRenameClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Rename Chat</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter chat title"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  renameChat();
                }
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRenameClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={renameChat}
              isDisabled={!renameValue.trim()}
            >
              Rename
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ChatPage;
