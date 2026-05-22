/**
 * Gmail API Helper for Google Groups
 * Documentation: https://developers.google.com/gmail/api/reference/rest
 *
 * This helper provides functions to interact with Gmail API to read emails sent to Google Groups.
 * Note: Requires OAuth 2.0 authentication with Gmail API access.
 */

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  payload?: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body?: {
        data?: string;
      };
    }>;
  };
  internalDate: string;
}

interface GmailListResponse {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

interface GoogleGroupsConfig {
  accessToken: string;
  groupEmail: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

// Cache for refreshed access token
let cachedAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Refreshes the access token using refresh token
 */
async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh access token: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };

  // Cache the new token and set expiry time (with 5 min buffer)
  cachedAccessToken = data.access_token;
  tokenExpiryTime = Date.now() + ((data.expires_in - 300) * 1000);

  console.log('✅ Access token refreshed successfully');
  return data.access_token;
}

/**
 * Gets Google Groups configuration from environment variables
 */
async function getGoogleGroupsConfig(): Promise<GoogleGroupsConfig> {
  const groupEmail = process.env.GOOGLE_GROUP_ID;
  const refreshToken = process.env.GOOGLE_GROUPS_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  let accessToken = process.env.GOOGLE_GROUPS_ACCESS_TOKEN || process.env.GOOGLE_GROUPS_API_KEY;

  if (!groupEmail) {
    throw new Error('GOOGLE_GROUP_ID is required in .env file');
  }

  // If refresh token is configured, use it to get/refresh access token
  if (refreshToken && clientId && clientSecret) {
    // Check if cached token is still valid
    if (cachedAccessToken && Date.now() < tokenExpiryTime) {
      accessToken = cachedAccessToken;
    } else {
      // Refresh the token
      accessToken = await refreshAccessToken(refreshToken, clientId, clientSecret);
    }
  } else if (!accessToken) {
    throw new Error(
      'Google Groups configuration missing. Please set either:\n' +
      '1. GOOGLE_GROUPS_ACCESS_TOKEN (expires in 1 hour)\n' +
      '2. GOOGLE_GROUPS_REFRESH_TOKEN + GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET (recommended)'
    );
  }

  return { accessToken, groupEmail, refreshToken, clientId, clientSecret };
}

/**
 * Gets all messages for a Gmail/Google Group account
 *
 * API Endpoint: GET https://gmail.googleapis.com/gmail/v1/users/{userId}/messages
 * Documentation: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list
 *
 * @param maxResults - Maximum number of results to return (default: 25)
 * @param query - Gmail search query (optional, e.g., "subject:test")
 * @returns Array of message IDs and thread IDs
 */
export async function getGmailMessages(maxResults: number = 25, query?: string): Promise<GmailListResponse> {
  const config = await getGoogleGroupsConfig();
  const baseUrl = 'https://gmail.googleapis.com/gmail/v1/users';

  // Use 'me' for authenticated user or the group email
  const userId = 'me';

  let url = `${baseUrl}/${userId}/messages?maxResults=${maxResults}`;
  if (query) {
    url += `&q=${encodeURIComponent(query)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return (await response.json()) as GmailListResponse;
}

/**
 * Gets a specific message by ID with full content
 *
 * API Endpoint: GET https://gmail.googleapis.com/gmail/v1/users/{userId}/messages/{id}
 * Documentation: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get
 *
 * @param messageId - The ID of the message to retrieve
 * @returns Full message details including headers and body
 */
export async function getGmailMessage(messageId: string): Promise<GmailMessage> {
  const config = await getGoogleGroupsConfig();
  const baseUrl = 'https://gmail.googleapis.com/gmail/v1/users';
  const userId = 'me';

  const url = `${baseUrl}/${userId}/messages/${messageId}?format=full`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return (await response.json()) as GmailMessage;
}

/**
 * Extracts header value from Gmail message
 */
function getHeader(message: GmailMessage, headerName: string): string | undefined {
  if (!message.payload?.headers) return undefined;
  const header = message.payload.headers.find(h => h.name.toLowerCase() === headerName.toLowerCase());
  return header?.value;
}

/**
 * Decodes base64url encoded string (Gmail uses base64url encoding)
 */
function decodeBase64Url(data: string): string {
  // Replace base64url characters with base64
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  // Decode base64 to UTF-8
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Extracts email body from Gmail message
 */
function getEmailBody(message: GmailMessage): { html?: string; text?: string } {
  if (!message.payload) return {};

  let html: string | undefined;
  let text: string | undefined;

  // Check if body is directly in payload
  if (message.payload.body?.data) {
    const decoded = decodeBase64Url(message.payload.body.data);
    // Assume it's text if no parts
    text = decoded;
  }

  // Check parts for multipart messages
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        html = decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/plain' && part.body?.data) {
        text = decodeBase64Url(part.body.data);
      }
    }
  }

  return { html, text };
}

/**
 * Waits for an email to arrive in Gmail/Google Group
 *
 * Polls Gmail API every 2 seconds until an email matching the criteria is found
 *
 * @param recipientEmail - The recipient email address (typically the Google Group email)
 * @param subject - Subject to match (partial match, case-insensitive)
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 30000 = 30 seconds)
 * @returns The matched message with parsed content
 * @throws Error if timeout is reached or no matching email is found
 *
 * @example
 * const message = await waitForGoogleGroupEmail('qa-team@shopopop.com', 'Configuration du compte');
 * console.log(message.htmlBody); // Email HTML content
 */
export async function waitForGoogleGroupEmail(
  recipientEmail: string,
  subject: string,
  timeoutMs: number = 45000
): Promise<{
  id: string;
  subject: string;
  author: { email: string; displayName: string };
  htmlBody?: string;
  plainTextBody?: string;
  snippet: string;
  updateTime: string;
}> {
  const startTime = Date.now();
  const pollInterval = 2000; // Check every 2 seconds

  console.log(`Waiting for email to ${recipientEmail} with subject containing "${subject}"...`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Search for recent messages with subject filter
      const searchQuery = `to:${recipientEmail} subject:"${subject}" newer_than:1h`;
      const listResponse = await getGmailMessages(10, searchQuery);

      if (listResponse.messages && listResponse.messages.length > 0) {
        // Get the most recent message
        const latestMessageId = listResponse.messages[0].id;
        const fullMessage = await getGmailMessage(latestMessageId);

        const messageSubject = getHeader(fullMessage, 'Subject') || '';
        const fromHeader = getHeader(fullMessage, 'From') || '';
        const dateHeader = getHeader(fullMessage, 'Date') || '';

        // Extract email and name from "Name <email>" format
        const fromMatch = fromHeader.match(/(.+?)\s*<(.+?)>/) || [null, fromHeader, fromHeader];
        const fromName = fromMatch[1]?.trim() || '';
        const fromEmail = fromMatch[2]?.trim() || fromHeader;

        const body = getEmailBody(fullMessage);

        console.log(`Found matching email: "${messageSubject}" from ${fromEmail}`);

        return {
          id: fullMessage.id,
          subject: messageSubject,
          author: {
            email: fromEmail,
            displayName: fromName
          },
          htmlBody: body.html,
          plainTextBody: body.text,
          snippet: fullMessage.snippet,
          updateTime: dateHeader
        };
      }
    } catch (error) {
      console.warn('Error checking for email:', error);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(
    `Timeout waiting for email to ${recipientEmail} with subject containing "${subject}" after ${timeoutMs}ms`
  );
}

/**
 * Gets the most recent message from Gmail
 *
 * @returns The most recent message with full details
 */
export async function getLatestGoogleGroupMessage(): Promise<GmailMessage | null> {
  const listResponse = await getGmailMessages(1);

  if (!listResponse.messages || listResponse.messages.length === 0) {
    return null;
  }

  return await getGmailMessage(listResponse.messages[0].id);
}

/**
 * Deletes (trashes) a Gmail message by ID
 *
 * API Endpoint: POST https://gmail.googleapis.com/gmail/v1/users/{userId}/messages/{id}/trash
 * Documentation: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/trash
 *
 * @param messageId - The ID of the message to delete
 * @returns Success status
 *
 * @example
 * await deleteGmailMessage(receivedEmail.id);
 */
export async function deleteGmailMessage(messageId: string): Promise<void> {
  const config = await getGoogleGroupsConfig();
  const baseUrl = 'https://gmail.googleapis.com/gmail/v1/users';
  const userId = 'me';

  const url = `${baseUrl}/${userId}/messages/${messageId}/trash`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  console.log(`✅ Email ${messageId} moved to trash`);
}

/**
 * Permanently deletes a Gmail message by ID (bypasses trash)
 *
 * API Endpoint: DELETE https://gmail.googleapis.com/gmail/v1/users/{userId}/messages/{id}
 * Documentation: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/delete
 *
 * @param messageId - The ID of the message to permanently delete
 * @returns Success status
 *
 * @example
 * await permanentlyDeleteGmailMessage(receivedEmail.id);
 */
export async function permanentlyDeleteGmailMessage(messageId: string): Promise<void> {
  const config = await getGoogleGroupsConfig();
  const baseUrl = 'https://gmail.googleapis.com/gmail/v1/users';
  const userId = 'me';

  const url = `${baseUrl}/${userId}/messages/${messageId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  console.log(`✅ Email ${messageId} permanently deleted`);
}

/**
 * Extracts a link from email HTML body containing specific text in a span
 *
 * @param emailBody - HTML body of the email
 * @param linkText - Text content to search for in a span within the link (e.g., "Configurer mon mot de passe")
 * @returns The href URL of the matching link, or null if not found
 *
 * @example
 * const link = extractLinkFromEmail(email.htmlBody, 'Configurer mon mot de passe');
 * await page.goto(link);
 */
export function extractLinkFromEmail(emailBody: string | undefined, linkText: string): string | null {
  if (!emailBody) return null;

  // Search for <a> tags that contain a <span> with the specified text
  // Equivalent to XPath: //span[text()="Configurer mon mot de passe"]/ancestor::a

  // Pattern: <a href="URL">...<span>text</span>...</a>
  // Use [\s\S]*? to match across newlines and handle nested spans
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(emailBody)) !== null) {
    const href = match[1];
    const content = match[2];

    // Check if the link content contains the search text (handles nested spans)
    // Remove all HTML tags and normalize whitespace
    const textContent = content
      .replace(/<[^>]+>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .trim();

    // Check if the text content includes the search text
    if (textContent.includes(linkText.trim())) {
      // Decode HTML entities if present
      return href.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
  }

  return null;
}