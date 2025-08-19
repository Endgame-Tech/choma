/**
 * Request Deduplication Service
 * Prevents duplicate API calls from being made simultaneously
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicationService {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private readonly TTL = 5000; // 5 seconds

  /**
   * Generate a unique key for the request
   */
  private generateKey(url: string, method: string, params?: Record<string, unknown>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${method}:${url}:${paramString}`;
  }

  /**
   * Clean up expired pending requests
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.TTL) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Execute request with deduplication
   */
  async execute<T>(
    key: string,
    requestFunction: () => Promise<T>
  ): Promise<T> {
    this.cleanup();

    // Check if request is already pending
    const existing = this.pendingRequests.get(key) as PendingRequest<T> | undefined;
    if (existing) {
      console.log(`🔄 Deduplicating request: ${key}`);
      return existing.promise;
    }

    // Create new request
    const promise = requestFunction();
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    } as PendingRequest<unknown>);

    try {
      const result = await promise;
      this.pendingRequests.delete(key);
      return result;
    } catch (error) {
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  /**
   * Helper method to deduplicate API calls
   */
  async deduplicateApiCall<T>(
    url: string,
    method: string,
    apiFunction: () => Promise<T>,
    params?: Record<string, unknown>
  ): Promise<T> {
    const key = this.generateKey(url, method, params);
    return this.execute(key, apiFunction);
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get statistics about current pending requests
   */
  getStats(): { pendingCount: number; keys: string[] } {
    return {
      pendingCount: this.pendingRequests.size,
      keys: Array.from(this.pendingRequests.keys())
    };
  }
}

export const requestDeduplicationService = new RequestDeduplicationService();
export default requestDeduplicationService;
