// Email Feature Exports

// Components
export { EmailConnectionManager } from './components/EmailConnectionManager'
export { EmailComposer } from './components/EmailComposer'
export { TipTapEditor } from './components/TipTapEditor'
export { TipTapMenuBar } from './components/TipTapMenuBar'

// Hooks
export {
  useEmailConnection,
  useEmailConnectionStatus,
  useEmailOAuthTokens,
  useEmailQuota,
  useConnectGmail,
  useDisconnectEmail,
  useOAuthConfig,
  emailConnectionKeys,
} from './hooks/useEmailConnection'

// Services
export {
  getEmailConnectionStatus,
  getEmailOAuthTokens,
  initiateGmailOAuth,
  disconnectEmail,
  getEmailQuota,
  isEmailConfigured,
  getOAuthConfigStatus,
} from './services/emailConnectionService'

export {
  sanitizeHtml,
  sanitizeForEmail,
  stripHtml,
  containsDangerousContent,
} from './services/sanitizationService'

export {
  convertHtmlToText,
  generatePreviewText,
  countWords,
  estimateReadingTime,
} from './services/htmlToTextService'
