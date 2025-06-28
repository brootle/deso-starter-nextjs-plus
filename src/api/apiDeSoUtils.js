// optionally support FormData for file uploads
export function createApiHandler({ baseUrl }) {
  return async function apiRequest({ endpoint, options = {} }) {
    const isFormData = options.body instanceof FormData;

    const defaultOptions = {
      method: "POST",
      headers: isFormData
        ? { ...options.headers } // ✅ Let browser set Content-Type for FormData
        : {
            "Content-Type": "application/json",
            ...options.headers,
          },
      ...options,
    };

    try {
      const response = await fetch(`${baseUrl}/${endpoint}`, defaultOptions);
      const data = await response.json();

      return response.ok
        ? { success: true, data }
        : { success: false, error: data?.error || "Unknown API error" };
    } catch (error) {
      return { success: false, error: error?.message || "Network error" };
    }
  };
}