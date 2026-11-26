import { filterBlockedContent, isBlockedUsername } from '../utils/contentModeration';

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
      if (typeof options.body === 'string' &&
          isBlockedUsername(JSON.parse(options.body)?.Username)) {
        return { success: false, error: 'This account is unavailable.' };
      }
      const response = await fetch(`${baseUrl}/${endpoint}`, defaultOptions);
      const data = await response.json();

      return response.ok
        ? { success: true, data: filterBlockedContent(data) }
        : { success: false, error: data?.error || "Unknown API error" };
    } catch (error) {
      return { success: false, error: error?.message || "Network error" };
    }
  };
}




// export function createApiHandler({ baseUrl }) {
//   return async function apiRequest({ endpoint, options = {} }) {
//     const defaultOptions = {
//       method: "POST", // ✅ Default to POST
//       headers: {
//         "Content-Type": "application/json", // ✅ Default header
//         ...options.headers, // Merge user-defined headers
//       },
//       ...options, // Spread options (user can override)
//     };

//     try {
//       const response = await fetch(`${baseUrl}/${endpoint}`, defaultOptions);
//       const data = await response.json();

//       return response.ok
//         ? { success: true, data }
//         : { success: false, error: data?.error || "Unknown API error" };
//     } catch (error) {
//       return { success: false, error: error?.message || "Network error" };
//     }
//   };
// }
