/**
 * HeaderHound loader — reference consumer for Google Apps Script / Gmail.
 * -------------------------------------------------------------------
 * Detects cold-outreach / sales-engagement mail using the shared HeaderHound
 * fingerprint list, and labels it in Gmail. Two-layer allowlist:
 *
 *   PUBLIC allowlist  — fetched from the HeaderHound repo (allowlist.json).
 *                       Community-maintained: Slack, GitHub, DocuSign, etc.
 *   PRIVATE allowlist — YOUR domains + trusted vendors, managed in a Google
 *                       Sheet. No code editing — you just type domains into it.
 *
 * NON-DEVELOPER SETUP (see GETTING-STARTED.md for the friendly version):
 *   1. Paste this whole file into script.google.com (new project). Save.
 *      (LIST_BASE_URL below already points at the headerhound-dev/headerhound repo.)
 *   2. Run setupAllowlistSheet()  -> creates your settings spreadsheet; open the
 *      link it prints (View > Logs) and bookmark it. Add your domains there.
 *   3. Run scanInbox() once (approve the Google permission prompt).
 *   4. Run installTrigger() once (runs it automatically every 10 minutes).
 * From then on you never touch the code — manage everything in the Sheet.
 */

// ============================ CONFIG ============================

var CONFIG = {
  // Raw base URL of the HeaderHound repo (no trailing slash).
  LIST_BASE_URL: 'https://raw.githubusercontent.com/headerhound-dev/headerhound/main', // already set

  LABEL_DETERMINISTIC: 'Cold Outreach/SPAM',
  LABEL_HEURISTIC:     'Cold Outreach/Possible SPAM',

  FIRST_RUN_LOOKBACK: 'newer_than:2d',
  OVERLAP_SECONDS: 300,
  MAX_THREADS_PER_RUN: 50,
  POSSIBLE_THRESHOLD: 2,

  LIST_CACHE_MINUTES: 360,   // re-fetch the public lists at most every 6 hours
  ALLOW_CACHE_MINUTES: 10,   // re-read your private Sheet at most every 10 minutes

  LOG_FLAGGED_TO_SHEET: true, // append every flagged message to the "Flagged log" tab

  ARCHIVE_DETERMINISTIC: false,
  ARCHIVE_HEURISTIC:     false,
  MARK_DETERMINISTIC_READ: false
};

var PROP_LASTRUN  = 'headerhound_lastRun';
var PROP_SHEET_ID = 'headerhound_sheetId';
var ALLOWLIST_TAB = 'Allowlist';
var FLAGGED_TAB   = 'Flagged log';

// ========================= SETTINGS SHEET =========================

/** Run once. Creates your personal settings spreadsheet and remembers it. */
function setupAllowlistSheet() {
  var props = PropertiesService.getUserProperties();
  var existing = props.getProperty(PROP_SHEET_ID);
  if (existing) {
    try {
      var url0 = SpreadsheetApp.openById(existing).getUrl();
      Logger.log('Settings sheet already exists:\n%s', url0);
      return url0;
    } catch (e) { /* recreate below if it was deleted */ }
  }

  var ss = SpreadsheetApp.create('HeaderHound — Settings');

  var allow = ss.getSheets()[0].setName(ALLOWLIST_TAB);
  allow.getRange('A1').setValue('Your allowlist — domains that are NEVER flagged (your company + trusted vendors)').setFontWeight('bold');
  allow.getRange('A2').setValue('example.com');
  allow.getRange('A3').setValue('yourcompany.com');
  allow.setColumnWidth(1, 380);
  allow.setFrozenRows(1);

  var flagged = ss.insertSheet(FLAGGED_TAB);
  flagged.getRange('A1:E1').setValues([['When', 'Tier', 'From', 'Subject', 'Why']]).setFontWeight('bold');
  flagged.setFrozenRows(1);
  flagged.setColumnWidth(3, 240);
  flagged.setColumnWidth(4, 300);
  flagged.setColumnWidth(5, 260);

  props.setProperty(PROP_SHEET_ID, ss.getId());
  var url = ss.getUrl();
  Logger.log('Created your HeaderHound settings sheet. Open and bookmark it:\n%s\n\nAdd one domain per row under the "%s" tab.', url, ALLOWLIST_TAB);
  return url;
}

function getSettingsSheet_() {
  var id = PropertiesService.getUserProperties().getProperty(PROP_SHEET_ID);
  if (!id) return null;
  try { return SpreadsheetApp.openById(id); } catch (e) { return null; }
}

// ===================== PRIVATE ALLOWLIST (Sheet) =====================

function getPrivateAllowlist() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('headerhound_private_allow');
  if (cached !== null) return JSON.parse(cached);

  var domains = [];
  var ss = getSettingsSheet_();
  if (ss) {
    var sh = ss.getSheetByName(ALLOWLIST_TAB);
    if (sh && sh.getLastRow() > 1) {
      var values = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < values.length; i++) {
        var d = String(values[i][0] || '').trim().toLowerCase();
        d = d.replace(/^https?:\/\//, '').replace(/^@/, '').replace(/\/.*$/, '');
        if (d && d.indexOf('.') !== -1) domains.push(d);
      }
    }
  }
  cache.put('headerhound_private_allow', JSON.stringify(domains), CONFIG.ALLOW_CACHE_MINUTES * 60);
  return domains;
}

/** Convenience: add a domain to your allowlist from code (optional; the Sheet is easier). */
function addAllowedDomain(domain) {
  var ss = getSettingsSheet_();
  if (!ss) { Logger.log('Run setupAllowlistSheet() first.'); return; }
  ss.getSheetByName(ALLOWLIST_TAB).appendRow([String(domain).trim().toLowerCase()]);
  CacheService.getScriptCache().remove('headerhound_private_allow');
  Logger.log('Added %s to your allowlist.', domain);
}

// ===================== PUBLIC LISTS (repo) =====================

function fetchJson_(path, cacheKey) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  var resp = UrlFetchApp.fetch(CONFIG.LIST_BASE_URL + path, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw new Error('HeaderHound fetch failed (' + path + '): HTTP ' + resp.getResponseCode());
  var text = resp.getContentText();
  cache.put(cacheKey, text, CONFIG.LIST_CACHE_MINUTES * 60);
  return JSON.parse(text);
}

function loadFingerprints() {
  var data = fetchJson_('/fingerprints.json', 'headerhound_fp_json');
  var out = [], list = (data && data.fingerprints) || [];
  for (var i = 0; i < list.length; i++) {
    var fp = list[i];
    try {
      out.push({ name: fp.name, scope: fp.scope || 'headers', field: fp.field || null, re: new RegExp(fp.pattern, 'i') });
    } catch (e) { Logger.log('Skipping bad pattern for %s: %s', fp.id, e.message); }
  }
  return out;
}

function getPublicAllowlist() {
  var data = fetchJson_('/allowlist.json', 'headerhound_allow_json');
  var out = [], list = (data && data.allow) || [];
  for (var i = 0; i < list.length; i++) if (list[i].domain) out.push(String(list[i].domain).toLowerCase());
  return out;
}

// ============================ MAIN ============================

function scanInbox() {
  var fingerprints = loadFingerprints();

  // Merge public + private allowlists into a set of registrable domains.
  var allowSet = {};
  var pub = getPublicAllowlist(), priv = getPrivateAllowlist();
  for (var a = 0; a < pub.length; a++)  allowSet[registrable(pub[a])]  = true;
  for (var b = 0; b < priv.length; b++) allowSet[registrable(priv[b])] = true;

  var det  = getOrCreateLabel(CONFIG.LABEL_DETERMINISTIC);
  var heur = getOrCreateLabel(CONFIG.LABEL_HEURISTIC);

  var me = (Session.getActiveUser().getEmail() || '').toLowerCase();
  var props = PropertiesService.getUserProperties();
  var lastRun = parseInt(props.getProperty(PROP_LASTRUN), 10);
  var nowSec = Math.floor(Date.now() / 1000);

  var query = 'in:inbox ' + ((lastRun > 0)
    ? 'after:' + Math.max(0, lastRun - CONFIG.OVERLAP_SECONDS)
    : CONFIG.FIRST_RUN_LOOKBACK);

  var threads = GmailApp.search(query, 0, CONFIG.MAX_THREADS_PER_RUN);
  var flaggedDet = 0, flaggedHeur = 0, logRows = [];

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t];
    var messages = thread.getMessages();
    var verdict = 'none', reasons = [], sampleFrom = '';

    for (var m = 0; m < messages.length; m++) {
      var msg = messages[m];
      var from = (msg.getFrom() || '').toLowerCase();
      if (me && from.indexOf(me) !== -1) continue;

      var raw     = msg.getRawContent() || '';
      var idx     = raw.search(/\r?\n\r?\n/);
      var headers = idx === -1 ? raw : raw.substring(0, idx);
      var body    = idx === -1 ? ''  : raw.substring(idx);

      var fromDomain = registrable(domainOf(getHeader(headers, 'From')));
      if (fromDomain && allowSet[fromDomain]) continue; // allowlisted — skip entirely

      var hit = fingerprintHit(fingerprints, headers, body);
      if (hit) { verdict = 'deterministic'; reasons = ['platform:' + hit]; sampleFrom = msg.getFrom(); break; }

      if (isTransactional(headers)) continue;

      var h = heuristicScore(headers, body);
      if (h.score >= CONFIG.POSSIBLE_THRESHOLD && verdict !== 'deterministic') {
        verdict = 'heuristic'; reasons = h.signals; sampleFrom = msg.getFrom();
      }
    }

    if (verdict === 'deterministic') {
      thread.addLabel(det);
      if (CONFIG.MARK_DETERMINISTIC_READ) thread.markRead();
      if (CONFIG.ARCHIVE_DETERMINISTIC) thread.moveToArchive();
      flaggedDet++;
    } else if (verdict === 'heuristic') {
      thread.addLabel(heur);
      if (CONFIG.ARCHIVE_HEURISTIC) thread.moveToArchive();
      flaggedHeur++;
    }

    if (verdict !== 'none') {
      logRows.push([new Date(), verdict === 'deterministic' ? 'SPAM' : 'Possible', sampleFrom, thread.getFirstMessageSubject(), reasons.join(', ')]);
    }
  }

  if (CONFIG.LOG_FLAGGED_TO_SHEET && logRows.length) writeFlaggedLog_(logRows);

  props.setProperty(PROP_LASTRUN, String(nowSec));
  Logger.log('Scanned %s thread(s): %s deny-list, %s heuristic.', threads.length, flaggedDet, flaggedHeur);
}

function writeFlaggedLog_(rows) {
  var ss = getSettingsSheet_();
  if (!ss) return;
  var sh = ss.getSheetByName(FLAGGED_TAB);
  if (!sh) return;
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
}

// ====================== DETECTION ======================

function fingerprintHit(fingerprints, headers, body) {
  for (var i = 0; i < fingerprints.length; i++) {
    var fp = fingerprints[i], haystack;
    if (fp.field) haystack = getHeader(headers, fp.field);
    else if (fp.scope === 'received') haystack = allHeaders(headers, 'Received');
    else if (fp.scope === 'body') haystack = body;
    else haystack = headers;
    if (haystack && fp.re.test(haystack)) return fp.name;
  }
  return null;
}

function isTransactional(headers) {
  var autoSubmitted = getHeader(headers, 'Auto-Submitted');
  if (autoSubmitted && !/^no$/i.test(autoSubmitted)) return true;
  if (getHeader(headers, 'List-Id')) return true;
  // RFC 8058 one-click unsubscribe and feedback-loop IDs are hallmarks of
  // legitimate bulk/transactional senders (LinkedIn, newsletters, notifications).
  // Cold outreach faking a personal 1:1 note does not use these.
  if (/one-click/i.test(getHeader(headers, 'List-Unsubscribe-Post'))) return true;
  if (getHeader(headers, 'Feedback-ID') || getHeader(headers, 'X-Feedback-ID')) return true;
  return false;
}

function heuristicScore(headers, body) {
  var signals = [];
  var to         = getHeader(headers, 'To');
  var listUnsub  = getHeader(headers, 'List-Unsubscribe');
  var listId     = getHeader(headers, 'List-Id');
  var fromDomain = domainOf(getHeader(headers, 'From'));
  var returnPath = domainOf(getHeader(headers, 'Return-Path'));
  var received   = allHeaders(headers, 'Received');
  var xCampaign  = getHeader(headers, 'X-Campaign') || getHeader(headers, 'X-CID');

  var singleRecipient = to && to.split(',').length === 1;
  if (listUnsub && singleRecipient && !listId) signals.push('list-unsubscribe-on-1:1');
  if (fromDomain && returnPath && registrable(fromDomain) !== registrable(returnPath)) signals.push('from/return-path-mismatch');
  if (/ec2-|compute[-\.]|amazonaws\.com|digitalocean|\bdroplet\b|linode|\.ovh\.|hetzner|contabo/i.test(received)) signals.push('cloud-ip-injection');
  if (/don'?t\s+want\s+to\s+hear\s+(from\s+me|back)|reply[^\n]{0,30}\bno\s+thanks\b|not\s+interested[,\s]+(just\s+)?reply/i.test(body)) signals.push('opt-out-boilerplate');
  // Note: Feedback-ID is intentionally NOT a positive signal — it's a legit-bulk
  // marker handled as an exclusion in isTransactional(). Only vendor campaign
  // headers count here.
  if (xCampaign) signals.push('campaign-headers');

  return { score: signals.length, signals: signals };
}

// ====================== HELPERS ======================

function getHeader(headers, name) {
  var re = new RegExp('^' + name + ':[ \\t]*([^\\r\\n]*(?:\\r?\\n[ \\t][^\\r\\n]*)*)', 'im');
  var mm = headers.match(re);
  return mm ? mm[1].replace(/\r?\n[ \t]+/g, ' ').trim() : '';
}

function allHeaders(headers, name) {
  var re = new RegExp('^' + name + ':[^\\r\\n]*(?:\\r?\\n[ \\t][^\\r\\n]*)*', 'gim');
  var matches = headers.match(re);
  return matches ? matches.join(' ') : '';
}

function domainOf(value) {
  if (!value) return '';
  var mm = value.match(/@([A-Za-z0-9.\-]+)/);
  return mm ? mm[1].toLowerCase().replace(/[>\s.]+$/, '') : '';
}

function registrable(domain) {
  if (!domain) return '';
  var parts = domain.split('.');
  return parts.length <= 2 ? domain : parts.slice(-2).join('.');
}

function getOrCreateLabel(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

/** Clear cached lists so the next scan re-fetches the repo and re-reads your Sheet. */
function refreshLists() {
  var cache = CacheService.getScriptCache();
  cache.remove('headerhound_fp_json');
  cache.remove('headerhound_allow_json');
  cache.remove('headerhound_private_allow');
  Logger.log('Caches cleared; next scan re-fetches everything.');
}

// ====================== SCHEDULING ======================

function installTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'scanInbox') ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('scanInbox').timeBased().everyMinutes(10).create();
  Logger.log('Trigger installed: scanInbox() every 10 minutes.');
}

function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'scanInbox') ScriptApp.deleteTrigger(triggers[i]);
  }
  Logger.log('Removed scanInbox trigger(s).');
}
