import { useMemo, useCallback } from "react";
import { createApiHandler } from "./apiDeSoUtils";
import { DESO_API_BASE } from "@/config/desoConfig";

export function useDeSoApi() {
  const baseUrl = DESO_API_BASE;
  const apiRequest = useMemo(() => createApiHandler({ baseUrl }), [baseUrl]);

  const getSingleProfile = useCallback((params) => {
    return apiRequest({
      endpoint: "get-single-profile",
      options: { body: JSON.stringify(params) },
    });
  }, [apiRequest]);

  // this can be used to load all alt users to switch account
  const getUsersStateless = useCallback((params) => {
    return apiRequest({
      endpoint: "get-users-stateless",
      options: { body: JSON.stringify(params) },
    });
  }, [apiRequest]);  

  const getTotalSupply = useCallback(() => {
    return apiRequest({
      endpoint: "total-supply",
      options: { method: "GET" },
    });
  }, [apiRequest]);  

  const getExchangeRate = useCallback(() => {
    return apiRequest({
      endpoint: "get-exchange-rate",
      options: { method: "GET" },
    });
  }, [apiRequest]);    

  // this is used to submit a post
  const submitPost = useCallback((params) => {
    return apiRequest({
      endpoint: "submit-post",
      options: {
        body: JSON.stringify(params),
      },
    });
  }, [apiRequest]);  

  // this is used to load posts for a specific user
  const getPostsForPublicKey = useCallback((params) => {
    return apiRequest({
      endpoint: "get-posts-for-public-key",
      options: { 
        body: JSON.stringify(params), 
      },
    });
  }, [apiRequest]);   

  // this is used to load a single post
  const getSinglePost = useCallback((params) => {
    return apiRequest({
      endpoint: "get-single-post",
      options: {
        body: JSON.stringify(params),
      },
    });
  }, [apiRequest]);  
  
  // this is used to search for profiles by username prefix
  const getProfiles = useCallback((params) => {
    return apiRequest({
      endpoint: "get-profiles",
      options: { body: JSON.stringify(params) },
    });
  }, [apiRequest]);  

  // can be used to get follow feed posts
  const getPostsStateless = useCallback((params) => {
    return apiRequest({
      endpoint: "get-posts-stateless",
      options: { 
        body: JSON.stringify(params), 
      },
    });
  }, [apiRequest]);    

  // for notifiations feed
  const getNotifications = useCallback((params) => {
    return apiRequest({
      endpoint: "get-notifications",
      options: { body: JSON.stringify(params) },
    });
  }, [apiRequest]);    

  // upload image to deso 
  const uploadImage = useCallback((params) => {
    const { imageFile, userPublicKey, jwt } = params;

    if (!imageFile || !userPublicKey || !jwt) {
      return Promise.resolve({ success: false, error: "Missing data" });
    }

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("UserPublicKeyBase58Check", userPublicKey);
    formData.append("JWT", jwt);

    return apiRequest({
      endpoint: "upload-image",
      options: { body: formData},
    });
  }, [apiRequest]);

  // this is used to Link/Unlike a post
  const createLike = useCallback((params) => {
    return apiRequest({
      endpoint: "create-like-stateless",
      options: {
        body: JSON.stringify(params),
      },
    });
  }, [apiRequest]);    

  return {
    getSingleProfile,
    getUsersStateless,
    getTotalSupply,
    getExchangeRate,
    submitPost,
    getPostsForPublicKey,
    getSinglePost,
    getProfiles,
    getPostsStateless,
    getNotifications,
    uploadImage,
    createLike
  };
}
