import { CleanerRules, EmailCategory, EmailMessage } from '../types';

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessageResponse {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: {
    headers?: GmailMessageHeader[];
  };
  internalDate?: string;
}

export async function fetchGmailProfile(accessToken: string) {
  if (!accessToken) {
    throw new Error('AUTH_EXPIRED');
  }
  try {
    const response = await fetch('/api/gmail/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('AUTH_EXPIRED');
      }
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Failed to fetch Gmail profile: ${response.statusText}`);
    }
    return await response.json();
  } catch (err: any) {
    if (err.message === 'AUTH_EXPIRED') throw err;
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
      throw new Error('Network error connecting to backend proxy. Please re-authorize Gmail access or open app in a new tab.');
    }
    throw err;
  }
}

/**
 * Executes a search query on Gmail API via server proxy with automatic pagination
 */
export async function searchMessageIds(
  accessToken: string,
  query: string,
  maxResults = 3000
): Promise<string[]> {
  if (!accessToken) {
    throw new Error('AUTH_EXPIRED');
  }

  console.log(`[Gmail API Search Request] Query: "${query}", targetMax: ${maxResults}`);

  const allIds: string[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const fetchMax = Math.min(500, maxResults - allIds.length);
    if (fetchMax <= 0) break;

    const url = new URL('/api/gmail/messages/search', window.location.origin);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', fetchMax.toString());
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('AUTH_EXPIRED');
      }
      const errText = await response.text();
      console.error(`Gmail search error for query "${query}":`, errText);
      break;
    }

    const data = await response.json();
    if (data.messages && Array.isArray(data.messages)) {
      const ids = data.messages.map((m: { id: string }) => m.id);
      allIds.push(...ids);
    }

    pageToken = data.nextPageToken;
  } while (pageToken && allIds.length < maxResults);

  console.log(`[Gmail API Search Result] Query: "${query}" => Total IDs collected: ${allIds.length}`);
  return allIds;
}

/**
 * Fetch detailed metadata for a batch of message IDs via server proxy
 */
export async function getMessagesMetadata(
  accessToken: string,
  messageIds: string[],
  category: EmailCategory,
  categoryLabel: string
): Promise<EmailMessage[]> {
  if (messageIds.length === 0) return [];

  const BATCH_SIZE = 100;
  const chunks: string[][] = [];
  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    chunks.push(messageIds.slice(i, i + BATCH_SIZE));
  }

  const results: EmailMessage[] = [];
  const fetchedIds = new Set<string>();

  // Execute chunk metadata fetches sequentially to maintain smooth rate limits
  for (const chunk of chunks) {
    try {
      const res = await fetch('/api/gmail/messages/batch-metadata', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: chunk }),
      });

      if (!res.ok) continue;

      const rawItems: GmailMessageResponse[] = await res.json();
      const now = new Date();

      rawItems.forEach((data) => {
        const headers = data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const subject = getHeader('Subject') || '(No Subject)';
        const from = getHeader('From') || '';
        const rawDate = getHeader('Date');

        let parsedDate = rawDate ? new Date(rawDate) : new Date();
        if (isNaN(parsedDate.getTime()) && data.internalDate) {
          const timestamp = parseInt(data.internalDate, 10);
          if (!isNaN(timestamp)) {
            parsedDate = new Date(timestamp);
          }
        }
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date();
        }

        const diffTime = Math.max(0, now.getTime() - parsedDate.getTime());
        const ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (data.id) {
          fetchedIds.add(data.id);
          results.push({
            id: data.id,
            threadId: data.threadId || data.id,
            subject,
            from: from || 'Mail Sender',
            date: parsedDate.toISOString(),
            snippet: data.snippet || '',
            category,
            categoryLabel,
            ageInDays,
          });
        }
      });
    } catch (err) {
      console.error(`Batch metadata fetch failed for category ${categoryLabel}:`, err);
    }
  }

  // For any missing IDs that didn't return metadata, create fallback item
  messageIds.forEach((id, idx) => {
    if (!fetchedIds.has(id)) {
      results.push({
        id,
        threadId: id,
        subject: `Mail Item #${idx + 1}`,
        from: `${categoryLabel} Mailbox Item`,
        date: new Date().toISOString(),
        snippet: 'Queued for bulk cleanup',
        category,
        categoryLabel,
        ageInDays: 0,
      });
    }
  });

  return results;
}

/**
 * Scans emails according to the active cleaner rules with parallel queries and fast batching
 */
export async function scanTargetedEmails(
  accessToken: string,
  rules: CleanerRules
): Promise<{ messages: EmailMessage[]; errors: string[] }> {
  console.log('[scanTargetedEmails] Initiating email scan with rules:', {
    olderThanDays: rules.olderThanDays,
    cleanInbox: rules.cleanInbox,
    cleanSpam: rules.cleanSpam,
    cleanTrash: rules.cleanTrash,
    cleanPromotions: rules.cleanPromotions,
    cleanSocial: rules.cleanSocial,
    cleanUpdates: rules.cleanUpdates,
    targetPrimarySendersCount: rules.targetPrimarySenders?.length,
    customQuery: rules.customQuery,
  });

  const allMessages: EmailMessage[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  const olderThanQuery = rules.olderThanDays > 0 ? `older_than:${rules.olderThanDays}d` : '';

  // Helper to search and attach metadata
  const searchAndProcess = async (
    query: string,
    category: EmailCategory,
    categoryLabel: string,
    max = 500
  ) => {
    try {
      console.log(`[scanTargetedEmails] Executing query: "${query}" for category: "${categoryLabel}" (max: ${max})`);
      const ids = await searchMessageIds(accessToken, query, max);
      const newIds = ids.filter((id) => !seenIds.has(id));
      newIds.forEach((id) => seenIds.add(id));

      console.log(`[scanTargetedEmails] Query "${query}" returned ${ids.length} raw IDs (${newIds.length} new)`);

      if (newIds.length > 0) {
        const msgs = await getMessagesMetadata(accessToken, newIds, category, categoryLabel);
        console.log(`[scanTargetedEmails] Fetched metadata for ${msgs.length} messages in "${categoryLabel}"`);
        return msgs;
      }
      return [];
    } catch (err: any) {
      console.error(`Query failed for ${categoryLabel}:`, err);
      errors.push(`${categoryLabel} scan failed: ${err.message || err}`);
      return [];
    }
  };

  // Build parallel search tasks
  const searchTasks: Array<Promise<EmailMessage[]>> = [];

  // 0. Custom Search Query
  if (rules.customQuery && rules.customQuery.trim()) {
    const query = [rules.customQuery.trim(), olderThanQuery].filter(Boolean).join(' ');
    searchTasks.push(searchAndProcess(query, 'primary_targeted', `Custom Search (${rules.customQuery})`, 1000));
  }

  // 1. General Inbox (Only scanned if explicitly enabled in rules)
  if (rules.cleanInbox === true) {
    const query = ['in:inbox', olderThanQuery].filter(Boolean).join(' ');
    searchTasks.push(searchAndProcess(query, 'primary_targeted', 'Inbox Folder', 500));
  }

  // 2. Spam Folder
  if (rules.cleanSpam) {
    const query = ['in:spam', olderThanQuery].filter(Boolean).join(' ');
    searchTasks.push(searchAndProcess(query, 'spam', 'Spam Folder', 500));
  }

  // 2b. Trash Folder
  if (rules.cleanTrash) {
    const query = ['in:trash', olderThanQuery].filter(Boolean).join(' ');
    searchTasks.push(searchAndProcess(query, 'trash', 'Trash Folder', 500));
  }

  // 3. Promotions
  if (rules.cleanPromotions) {
    const query = ['category:promotions', olderThanQuery].filter(Boolean).join(' ');
    searchTasks.push(searchAndProcess(query, 'promotions', 'Promotions Category', 500));
  }

  // 4. Socials
  if (rules.cleanSocial) {
    const query = ['category:social', olderThanQuery].filter(Boolean).join(' ');
    searchTasks.push(searchAndProcess(query, 'social', 'Social Category', 500));
  }

  // 5. Updates
  if (rules.cleanUpdates) {
    const query = ['category:updates', olderThanQuery].filter(Boolean).join(' ');
    searchTasks.push(searchAndProcess(query, 'updates', 'Updates Category', 500));
  }

  // 6. Targeted Primary Senders / Keywords (Only if cleanInbox is explicitly enabled)
  if (rules.cleanInbox === true && rules.targetPrimarySenders && rules.targetPrimarySenders.length > 0) {
    const validSenders = rules.targetPrimarySenders
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (validSenders.length > 0) {
      // Build combined OR query for primary inbox senders: in:inbox (from:"kw1" OR "kw1" OR ...)
      const senderOrParts = validSenders.map((kw) => `from:"${kw}" OR "${kw}"`).join(' OR ');
      const query = ['in:inbox', `(${senderOrParts})`, olderThanQuery].filter(Boolean).join(' ');
      searchTasks.push(searchAndProcess(query, 'primary_targeted', 'Targeted Primary Senders', 1000));
    }
  }

  // Run all category queries in parallel
  const taskResults = await Promise.allSettled(searchTasks);
  taskResults.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      allMessages.push(...res.value);
    }
  });

  // Safe Fallback only if cleanInbox is explicitly enabled
  if (allMessages.length === 0 && errors.length === 0 && rules.cleanInbox === true) {
    try {
      const broadQuery = [olderThanQuery].filter(Boolean).join(' ');
      const fallbackMsgs = await searchAndProcess(broadQuery || 'label:inbox', 'primary_targeted', 'Mailbox Broad Scan', 500);
      allMessages.push(...fallbackMsgs);
    } catch (err) {
      console.error('Fallback search error:', err);
    }
  }

  // Strictly deduplicate by message ID to prevent React duplicate key crashes
  const uniqueMap = new Map<string, EmailMessage>();
  allMessages.forEach((msg) => {
    if (msg && msg.id && !uniqueMap.has(msg.id)) {
      uniqueMap.set(msg.id, msg);
    }
  });
  const uniqueMessages = Array.from(uniqueMap.values());

  console.log(`[scanTargetedEmails] Summary: Finished scan with ${uniqueMessages.length} unique messages matched across all queries. Encountered ${errors.length} errors.`);
  return { messages: uniqueMessages, errors };
}

/**
 * Trashes or permanently deletes a batch of messages
 */
export async function removeMessagesBatch(
  accessToken: string,
  messageIds: string[],
  mode: 'trash' | 'permanent' = 'trash'
): Promise<{ successCount: number; failedCount: number }> {
  if (messageIds.length === 0) return { successCount: 0, failedCount: 0 };

  const BATCH_LIMIT = 1000; // Gmail API batchModify/batchDelete allows up to 1000 IDs per call
  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < messageIds.length; i += BATCH_LIMIT) {
    const chunk = messageIds.slice(i, i + BATCH_LIMIT);
    try {
      const response = await fetch('/api/gmail/messages/trash', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: chunk,
          mode,
        }),
      });

      if (response.ok) {
        totalSuccess += chunk.length;
      } else {
        console.error('Proxy trash error:', await response.text());
        totalFailed += chunk.length;
      }
    } catch (err) {
      console.error('Proxy trash request error:', err);
      totalFailed += chunk.length;
    }
  }

  return { successCount: totalSuccess, failedCount: totalFailed };
}
