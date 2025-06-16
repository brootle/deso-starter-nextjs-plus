/**
 * Initialization for the workerd runtime.
 *
 * The file must be imported at the top level the worker.
 */
/**
 * Executes the handler with the Cloudflare context.
 */
export declare function runWithCloudflareRequestContext(request: Request, env: CloudflareEnv, ctx: ExecutionContext, handler: () => Promise<Response>): Promise<Response>;
export type RemotePattern = {
    protocol?: "http" | "https";
    hostname: string;
    port?: string;
    pathname: string;
    search?: string;
};
/**
 * Fetches an images.
 *
 * Local images (starting with a '/' as fetched using the passed fetcher).
 * Remote images should match the configured remote patterns or a 404 response is returned.
 */
export declare function fetchImage(fetcher: Fetcher | undefined, url: string): Response | Promise<Response> | undefined;
export declare function matchRemotePattern(pattern: RemotePattern, url: URL): boolean;
declare global {
    var __BUILD_TIMESTAMP_MS__: number;
    var __NEXT_BASE_PATH__: string;
    var __IMAGES_REMOTE_PATTERNS__: RemotePattern[];
    var __IMAGES_LOCAL_PATTERNS__: unknown[];
}
