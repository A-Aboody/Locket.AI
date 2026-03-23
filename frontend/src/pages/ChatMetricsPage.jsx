import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  VStack,
  SimpleGrid,
  Card,
  CardBody,
  Button,
  Spinner,
  Flex,
  Badge,
  Progress,
  CircularProgress,
  CircularProgressLabel,
  useToast,
  Icon,
} from '@chakra-ui/react';
import { FiArrowLeft, FiActivity, FiShield, FiTarget } from 'react-icons/fi';
import AppHeader from '../custom_components/AppHeader';
import NavTabs from '../custom_components/NavTabs';
import { chatsAPI, apiUtils } from '../utils/api';

const scoreToPercent = (score) => Math.round((score || 0) * 100);

const TrendChart = ({ trends }) => {
  const width = 860;
  const height = 250;
  const padding = 24;

  const points = useMemo(() => {
    if (!trends || trends.length === 0) {
      return { accuracyPath: '', sanityPath: '', xLabels: [] };
    }

    const xStep = (width - padding * 2) / Math.max(trends.length - 1, 1);
    const toY = (value) => {
      const clamped = Math.max(0, Math.min(1, value || 0));
      return padding + (1 - clamped) * (height - padding * 2);
    };

    const accuracyPoints = trends
      .map((point, index) => `${padding + index * xStep},${toY(point.accuracy)}`)
      .join(' ');

    const sanityPoints = trends
      .map((point, index) => `${padding + index * xStep},${toY(point.sanity)}`)
      .join(' ');

    const xLabels = [
      trends[0]?.date,
      trends[Math.floor(trends.length / 2)]?.date,
      trends[trends.length - 1]?.date,
    ].filter(Boolean);

    return {
      accuracyPath: accuracyPoints,
      sanityPath: sanityPoints,
      xLabels,
    };
  }, [trends]);

  if (!trends?.length) {
    return <Text color="gray.500">No trend data yet.</Text>;
  }

  return (
    <VStack align="stretch" spacing={3}>
      <Box border="1px" borderColor="primary.700" borderRadius="lg" p={3} bg="primary.900">
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = padding + (1 - tick) * (height - padding * 2);
            return (
              <line
                key={tick}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
            );
          })}

          <polyline
            points={points.accuracyPath}
            fill="none"
            stroke="#5aa7ff"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={points.sanityPath}
            fill="none"
            stroke="#4fd1c5"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
        </svg>
      </Box>

      <HStack justify="space-between" color="gray.500" fontSize="xs">
        <Text>{points.xLabels[0]}</Text>
        <Text>{points.xLabels[1]}</Text>
        <Text>{points.xLabels[2]}</Text>
      </HStack>

      <HStack spacing={4} fontSize="sm">
        <HStack spacing={2}>
          <Box w="12px" h="12px" borderRadius="full" bg="#5aa7ff" />
          <Text color="gray.300">Accuracy</Text>
        </HStack>
        <HStack spacing={2}>
          <Box w="12px" h="12px" borderRadius="full" bg="#4fd1c5" />
          <Text color="gray.300">Sanity</Text>
        </HStack>
      </HStack>
    </VStack>
  );
};

const ChatMetricsPage = () => {
  const [user, setUser] = useState(null);
  const [periodDays, setPeriodDays] = useState(14);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const response = await chatsAPI.getRagasMetrics(periodDays);
        setMetrics(response.data);
      } catch (error) {
        toast({
          title: 'Failed to load metrics',
          description: apiUtils.handleError(error),
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [periodDays]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const groupedBreakdown = useMemo(() => {
    if (!metrics?.parameter_breakdown) return {};
    return metrics.parameter_breakdown.reduce((acc, item) => {
      if (!acc[item.parameter]) acc[item.parameter] = [];
      acc[item.parameter].push(item);
      return acc;
    }, {});
  }, [metrics]);

  return (
    <Box
      minH="100vh"
      bg="radial-gradient(circle at 1px 1px, rgba(96,126,255,0.12) 1px, transparent 0)"
      backgroundSize="22px 22px"
    >
      <AppHeader user={user} onLogout={handleLogout} onSettings={handleSettings} />
      <NavTabs />

      <Container maxW="container.2xl" py={6}>
        <VStack align="stretch" spacing={5}>
          <HStack justify="space-between" wrap="wrap" gap={3}>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiActivity} color="accent.400" />
                <Heading size="md" color="gray.100">RAGAS Metrics</Heading>
              </HStack>
              <Text color="gray.400" fontSize="sm">
                Accuracy and sanity checks for Locket chat quality.
              </Text>
            </VStack>

            <HStack spacing={2}>
              {[7, 14, 30].map((days) => (
                <Button
                  key={days}
                  size="sm"
                  variant={periodDays === days ? 'solid' : 'outline'}
                  onClick={() => setPeriodDays(days)}
                >
                  {days}d
                </Button>
              ))}
              <Button leftIcon={<FiArrowLeft />} size="sm" variant="ghost" onClick={() => navigate('/chat')}>
                Back to Chat
              </Button>
            </HStack>
          </HStack>

          {isLoading ? (
            <Flex justify="center" py={14}>
              <Spinner size="lg" color="accent.500" />
            </Flex>
          ) : (
            <>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Card bg="primary.900" border="1px" borderColor="primary.700">
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <HStack justify="space-between" w="full">
                        <HStack>
                          <Icon as={FiTarget} color="accent.400" />
                          <Text color="gray.300" fontSize="sm">Accuracy</Text>
                        </HStack>
                        <Badge colorScheme="blue">Headline</Badge>
                      </HStack>
                      <CircularProgress value={scoreToPercent(metrics?.headline?.accuracy)} color="blue.300" size="90px" thickness="8px">
                        <CircularProgressLabel color="gray.100" fontWeight="bold">
                          {scoreToPercent(metrics?.headline?.accuracy)}%
                        </CircularProgressLabel>
                      </CircularProgress>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg="primary.900" border="1px" borderColor="primary.700">
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <HStack justify="space-between" w="full">
                        <HStack>
                          <Icon as={FiShield} color="accent.400" />
                          <Text color="gray.300" fontSize="sm">Sanity Check</Text>
                        </HStack>
                        <Badge colorScheme="teal">RAGAS-like</Badge>
                      </HStack>
                      <CircularProgress value={scoreToPercent(metrics?.headline?.sanity)} color="teal.300" size="90px" thickness="8px">
                        <CircularProgressLabel color="gray.100" fontWeight="bold">
                          {scoreToPercent(metrics?.headline?.sanity)}%
                        </CircularProgressLabel>
                      </CircularProgress>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg="primary.900" border="1px" borderColor="primary.700">
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Text color="gray.400" fontSize="sm">Volume ({metrics?.period_days}d)</Text>
                      <Heading size="md" color="gray.100">{metrics?.summary?.total_answers || 0}</Heading>
                      <Text color="gray.500" fontSize="sm">answers generated</Text>
                      <HStack spacing={3} pt={1}>
                        <Badge colorScheme="purple">{metrics?.summary?.total_chats || 0} chats</Badge>
                        <Badge colorScheme="green">{metrics?.summary?.cited_documents || 0} docs cited</Badge>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                <Card bg="primary.900" border="1px" borderColor="primary.700">
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <Heading size="sm" color="gray.100">Accuracy vs Sanity Trend</Heading>
                      <TrendChart trends={metrics?.trends || []} />
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg="primary.900" border="1px" borderColor="primary.700">
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <Heading size="sm" color="gray.100">RAGAS Dimensions</Heading>
                      {(metrics?.metrics || []).map((metric) => (
                        <Box key={metric.key}>
                          <HStack justify="space-between" mb={1}>
                            <Text color="gray.300" fontSize="sm">{metric.label}</Text>
                            <Text color="gray.100" fontSize="sm" fontWeight="semibold">{scoreToPercent(metric.value)}%</Text>
                          </HStack>
                          <Progress value={scoreToPercent(metric.value)} borderRadius="full" bg="primary.700" colorScheme="teal" size="sm" />
                          <Text color="gray.500" fontSize="xs" mt={1}>{metric.description}</Text>
                        </Box>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>

              <Card bg="primary.900" border="1px" borderColor="primary.700">
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Heading size="sm" color="gray.100">Parameter Breakdown</Heading>
                    {Object.entries(groupedBreakdown).map(([parameter, items]) => (
                      <Box key={parameter}>
                        <Text textTransform="capitalize" color="gray.400" mb={2}>
                          {parameter.replace('_', ' ')}
                        </Text>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                          {items.map((item) => (
                            <Box key={`${item.parameter}-${item.bucket}`} p={3} border="1px" borderColor="primary.700" borderRadius="md" bg="primary.800">
                              <HStack justify="space-between" mb={2}>
                                <Text color="gray.300" fontSize="sm">{item.bucket}</Text>
                                <Badge colorScheme="blue">n={item.sample_size}</Badge>
                              </HStack>
                              <Progress value={scoreToPercent(item.score)} borderRadius="full" bg="primary.700" colorScheme="blue" size="sm" />
                              <Text color="gray.400" mt={2} fontSize="sm">{scoreToPercent(item.score)}%</Text>
                            </Box>
                          ))}
                        </SimpleGrid>
                      </Box>
                    ))}
                  </VStack>
                </CardBody>
              </Card>
            </>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default ChatMetricsPage;
