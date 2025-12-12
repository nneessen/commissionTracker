// Email Connection Manager Component
// Allows users to connect/disconnect Gmail and Outlook accounts

import {useState} from 'react'
import {Mail, AlertCircle, CheckCircle2, Loader2, LogOut, ExternalLink, RefreshCw} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Badge} from '@/components/ui/badge'
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger} from '@/components/ui/alert-dialog'
import {useEmailConnection, useEmailQuota} from '../hooks/useEmailConnection'
import {EmailProvider} from '@/types/email.types'

interface EmailConnectionManagerProps {
  className?: string
}

export function EmailConnectionManager({ className }: EmailConnectionManagerProps) {
  const {
    isConnected,
    provider,
    email,
    lastUsed,
    isLoading,
    error,
    isConfigured,
    gmailConfigured,
    connectGmail,
    isConnecting,
    disconnect,
    isDisconnecting,
    refetch,
  } = useEmailConnection()

  const { data: quota } = useEmailQuota(provider || 'gmail')

  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)

  // Handle URL parameters from OAuth callback
  const urlParams = new URLSearchParams(window.location.search)
  const oauthSuccess = urlParams.get('success') === 'email_connected'
  const oauthEmail = urlParams.get('email')
  const oauthError = urlParams.get('error')

  const handleDisconnect = () => {
    if (provider) {
      disconnect(provider)
      setShowDisconnectDialog(false)
    }
  }

  const formatLastUsed = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Connection
        </CardTitle>
        <CardDescription>
          Connect your email account to send emails directly from the app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* OAuth Success Message */}
        {oauthSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Email Connected</AlertTitle>
            <AlertDescription className="text-green-700">
              Successfully connected {oauthEmail}. You can now send emails from the app.
            </AlertDescription>
          </Alert>
        )}

        {/* OAuth Error Message */}
        {oauthError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>
              {decodeURIComponent(oauthError)}
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Warning */}
        {!isConfigured && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Email Not Configured</AlertTitle>
            <AlertDescription>
              Gmail OAuth credentials are not configured. Please set VITE_GOOGLE_CLIENT_ID and
              VITE_GOOGLE_REDIRECT_URI environment variables.
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        {isConnected ? (
          <div className="space-y-4">
            {/* Connected Account Info */}
            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                  <Badge variant="secondary">
                    {provider === 'gmail' ? 'Gmail' : 'Outlook'}
                  </Badge>
                </div>
                <p className="font-medium">{email}</p>
                <p className="text-sm text-muted-foreground">
                  Last used: {formatLastUsed(lastUsed)}
                </p>
              </div>
              <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    <LogOut className="mr-1 h-4 w-4" />
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Email Account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disconnect {email} from the app. You won't be able to send emails
                      until you reconnect. Any scheduled emails will fail to send.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Quota Info */}
            {quota && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Daily Email Quota</span>
                  <Button variant="ghost" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(quota.sent / quota.limit) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {quota.sent} / {quota.limit}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {quota.remaining} emails remaining today
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Gmail Connection */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Gmail</p>
                  <p className="text-sm text-muted-foreground">
                    Send emails from your Gmail account
                  </p>
                </div>
              </div>
              <Button
                onClick={() => connectGmail()}
                disabled={!gmailConfigured || isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Connect Gmail
              </Button>
            </div>

            {/* Outlook Connection (Coming Soon) */}
            <div className="flex items-center justify-between rounded-lg border p-4 opacity-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#0078D4"
                      d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.35.228-.574.228h-8.234v-6.182l1.602 1.172a.313.313 0 0 0 .378-.004l5.296-4.236a.479.479 0 0 0 .17-.234.506.506 0 0 0-.18-.497.485.485 0 0 0-.29-.123.493.493 0 0 0-.302.073l-5.098 4.076-1.576-1.154V7.387h7.234c.226 0 .42.076.578.228.158.152.234.346.234.576zM14.954 18.669V5.387c0-.188-.049-.346-.148-.472-.098-.127-.24-.19-.422-.19H1.058c-.182 0-.324.063-.422.19-.1.126-.148.284-.148.472v13.282c0 .188.048.346.148.472.098.127.24.19.422.19h13.326c.182 0 .324-.063.422-.19.1-.126.148-.284.148-.472zm-7.477-2.95c1.378 0 2.499-.43 3.363-1.29.864-.86 1.296-1.998 1.296-3.413 0-1.416-.432-2.553-1.296-3.413-.864-.86-1.985-1.29-3.363-1.29-1.377 0-2.498.43-3.362 1.29-.864.86-1.297 1.997-1.297 3.413 0 1.415.433 2.553 1.297 3.413.864.86 1.985 1.29 3.362 1.29zm0-1.82c-.802 0-1.43-.269-1.886-.806-.455-.537-.683-1.239-.683-2.107 0-.867.228-1.569.683-2.106.455-.537 1.084-.806 1.886-.806.803 0 1.432.269 1.887.806.455.537.683 1.239.683 2.106 0 .868-.228 1.57-.683 2.107-.455.537-1.084.806-1.887.806z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Outlook</p>
                  <p className="text-sm text-muted-foreground">
                    Coming soon
                  </p>
                </div>
              </div>
              <Button disabled>
                Connect Outlook
              </Button>
            </div>

            {/* Info about what happens when connecting */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>About Email Connection</AlertTitle>
              <AlertDescription className="text-sm">
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Emails will be sent from your actual email address</li>
                  <li>Sent emails will appear in your email's sent folder</li>
                  <li>Replies will be captured and shown in the app</li>
                  <li>You can disconnect at any time from this page</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load email connection status'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
