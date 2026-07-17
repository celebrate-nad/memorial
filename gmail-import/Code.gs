/**
 * Memorial site importer.
 *
 * This script runs inside Google Apps Script, bound to the Gmail account
 * that receives memorial photos/videos. On a timer, it:
 *   1. Searches Gmail for unread mail with attachments that has NOT yet
 *      been processed (tracked with the "memorial-imported" label).
 *   2. Uploads each supported photo/video attachment to Vercel Blob.
 *   3. Labels the message "memorial-imported" and marks it read so it is
 *      never processed twice.
 *
 * Setup:
 *   1. Go to https://script.google.com, create a new project.
 *   2. Paste this file in as Code.gs (replace the default content).
 *   3. In "Project Settings" > "Script Properties", add a property named
 *      BLOB_READ_WRITE_TOKEN with the token from your Vercel Blob store.
 *   4. Run `setUpMemorialImporter` once from the editor to create the
 *      Gmail label and the time-based trigger (see bottom of this file).
 *   5. Authorize the script when prompted (Gmail + external requests).
 *
 * See the project README for full step-by-step instructions.
 */

// Name of the Gmail label applied to processed messages. Change if you like.
const PROCESSED_LABEL_NAME = "memorial-imported";

// Gmail search query for messages to import. By default this looks at
// everything in the inbox with an attachment. Narrow this down (for example
// to a specific "from" address) if the inbox receives other mail too.
const SEARCH_QUERY = `has:attachment -label:${PROCESSED_LABEL_NAME}`;

// Maximum attachment size to accept, matching Gmail's own attachment limit.
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "m4v", "avi"];

const VERCEL_BLOB_API_URL = "https://vercel.com/api/blob";
const VERCEL_BLOB_API_VERSION = "12";

/**
 * Main entry point. Call this on a schedule (see setUpMemorialImporter).
 */
function importNewMemorialMedia() {
  const token = getBlobToken();
  ensureLabelExists(PROCESSED_LABEL_NAME);
  const label = GmailApp.getUserLabelByName(PROCESSED_LABEL_NAME);

  const threads = GmailApp.search(SEARCH_QUERY, 0, 50);
  Logger.log(`Found ${threads.length} thread(s) to check.`);

  let uploaded = 0;
  let skipped = 0;

  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const message of messages) {
      if (message.getLabels().some((l) => l.getName() === PROCESSED_LABEL_NAME)) {
        continue;
      }

      const attachments = message.getAttachments({
        includeInlineImages: false,
        includeAttachments: true,
      });

      for (const attachment of attachments) {
        const result = tryUploadAttachment(attachment, token);
        if (result === "uploaded") uploaded++;
        else skipped++;
      }

      message.markRead();
    }
    thread.addLabel(label);
  }

  Logger.log(`Done. Uploaded ${uploaded} file(s), skipped ${skipped}.`);
}

/**
 * Uploads a single Gmail attachment to Vercel Blob if it looks like a
 * supported photo or video. Returns "uploaded" or "skipped".
 */
function tryUploadAttachment(attachment, token) {
  const name = attachment.getName() || "attachment";
  const ext = extensionOf(name);
  const size = attachment.getSize();

  let kind = null;
  if (PHOTO_EXTENSIONS.indexOf(ext) !== -1) kind = "photos";
  else if (VIDEO_EXTENSIONS.indexOf(ext) !== -1) kind = "videos";

  if (!kind) {
    Logger.log(`Skipping "${name}": unsupported file type ".${ext}".`);
    return "skipped";
  }

  if (size > MAX_ATTACHMENT_BYTES) {
    Logger.log(`Skipping "${name}": ${size} bytes exceeds the size limit.`);
    return "skipped";
  }

  const pathname = `${kind}/${Date.now()}-${sanitizeFilename(name)}`;
  const contentType = attachment.getContentType() || "application/octet-stream";

  const response = UrlFetchApp.fetch(
    `${VERCEL_BLOB_API_URL}/?pathname=${encodeURIComponent(pathname)}`,
    {
      method: "put",
      contentType,
      payload: attachment.getBytes(),
      headers: {
        authorization: `Bearer ${token}`,
        "x-api-version": VERCEL_BLOB_API_VERSION,
        "x-content-type": contentType,
        "x-vercel-blob-access": "public",
        "x-add-random-suffix": "0",
      },
      muteHttpExceptions: true,
    },
  );

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    Logger.log(
      `Upload failed for "${name}" (HTTP ${status}): ${response.getContentText()}`,
    );
    return "skipped";
  }

  Logger.log(`Uploaded "${name}" -> ${pathname}`);
  return "uploaded";
}

function extensionOf(filename) {
  const parts = String(filename).split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function sanitizeFilename(filename) {
  return String(filename)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-150);
}

function getBlobToken() {
  const token = PropertiesService.getScriptProperties().getProperty(
    "BLOB_READ_WRITE_TOKEN",
  );
  if (!token) {
    throw new Error(
      'Missing script property "BLOB_READ_WRITE_TOKEN". Set it under ' +
        "Project Settings > Script Properties.",
    );
  }
  return token;
}

function ensureLabelExists(name) {
  if (!GmailApp.getUserLabelByName(name)) {
    GmailApp.createLabel(name);
  }
}

/**
 * One-time setup: creates the Gmail label and a time-based trigger that
 * runs importNewMemorialMedia every 10 minutes. Run this once manually
 * from the Apps Script editor (select this function, click Run).
 */
function setUpMemorialImporter() {
  ensureLabelExists(PROCESSED_LABEL_NAME);

  // Remove any existing triggers for this function first, so re-running
  // setup doesn't create duplicates.
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "importNewMemorialMedia") {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger("importNewMemorialMedia")
    .timeBased()
    .everyMinutes(10)
    .create();

  Logger.log(
    'Setup complete: label created and a trigger now runs "importNewMemorialMedia" every 10 minutes.',
  );
}
