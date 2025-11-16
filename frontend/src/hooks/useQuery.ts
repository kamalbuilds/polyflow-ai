import { useQuery as useReactQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Generic fetch function with error handling
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Custom hooks for common API operations

// Projects
export function useProjects() {
  return useReactQuery({
    queryKey: ['projects'],
    queryFn: () => fetchApi('/projects'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProject(id: string) {
  return useReactQuery({
    queryKey: ['project', id],
    queryFn: () => fetchApi(`/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => fetchApi('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Workflows
export function useWorkflows(projectId?: string) {
  return useReactQuery({
    queryKey: ['workflows', projectId],
    queryFn: () => fetchApi(`/workflows${projectId ? `?projectId=${projectId}` : ''}`),
  });
}

export function useWorkflow(id: string) {
  return useReactQuery({
    queryKey: ['workflow', id],
    queryFn: () => fetchApi(`/workflows/${id}`),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => fetchApi('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi(`/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

// Chains and Network
export function useChains() {
  return useReactQuery({
    queryKey: ['chains'],
    queryFn: () => fetchApi('/chains'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useChainStatus(chainId: string) {
  return useReactQuery({
    queryKey: ['chain-status', chainId],
    queryFn: () => fetchApi(`/chains/${chainId}/status`),
    enabled: !!chainId,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time status
  });
}

// XCM Messages
export function useXCMMessages(filters?: any) {
  const queryString = filters ? `?${new URLSearchParams(filters).toString()}` : '';

  return useReactQuery({
    queryKey: ['xcm-messages', filters],
    queryFn: () => fetchApi(`/xcm/messages${queryString}`),
  });
}

export function useSendXCMMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => fetchApi('/xcm/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['xcm-messages'] });
    },
  });
}

// AI Code Generation
export function useGenerateCode() {
  return useMutation({
    mutationFn: (data: { prompt: string; language: string; context?: string }) =>
      fetchApi('/ai/generate-code', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useChatCompletion() {
  return useMutation({
    mutationFn: (data: { messages: any[]; context?: string }) =>
      fetchApi('/ai/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

// Analytics
export function useProjectAnalytics(projectId: string, timeRange = '7d') {
  return useReactQuery({
    queryKey: ['project-analytics', projectId, timeRange],
    queryFn: () => fetchApi(`/analytics/projects/${projectId}?range=${timeRange}`),
    enabled: !!projectId,
  });
}

export function useNetworkMetrics(timeRange = '1h') {
  return useReactQuery({
    queryKey: ['network-metrics', timeRange],
    queryFn: () => fetchApi(`/analytics/network?range=${timeRange}`),
    refetchInterval: 60000, // Refetch every minute
  });
}

// User Management
export function useProfile() {
  return useReactQuery({
    queryKey: ['profile'],
    queryFn: () => fetchApi('/auth/profile'),
    retry: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => fetchApi('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// Custom hook for infinite scroll/pagination
export function useInfiniteData<T>(
  endpoint: string,
  options?: {
    limit?: number;
    filters?: Record<string, any>;
  }
) {
  const limit = options?.limit || 20;
  const filters = options?.filters || {};

  return useReactQuery({
    queryKey: ['infinite', endpoint, filters],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: limit.toString(),
        ...filters,
      });

      return fetchApi(`${endpoint}?${params}`);
    },
    getNextPageParam: (lastPage: any) => {
      if (lastPage.hasNext) {
        return lastPage.page + 1;
      }
      return undefined;
    },
  });
}

// Real-time data with WebSocket fallback
export function useRealTimeData<T>(
  endpoint: string,
  options?: {
    enableWebSocket?: boolean;
    fallbackInterval?: number;
  }
) {
  const enableWS = options?.enableWebSocket ?? true;
  const interval = options?.fallbackInterval ?? 5000;

  return useReactQuery({
    queryKey: ['realtime', endpoint],
    queryFn: () => fetchApi(endpoint),
    refetchInterval: enableWS ? false : interval,
  });
}

// Export fetch function for custom usage
export { fetchApi };