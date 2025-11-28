// src/features/recruiting/pages/MyRecruitingPipeline.tsx

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/base/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Upload,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  FileText,
  MessageSquare,
  Target,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRecruitPhaseProgress, useCurrentPhase } from '../hooks/useRecruitProgress';
import { useRecruitDocuments } from '../hooks/useRecruitDocuments';
import type { UserProfile } from '@/types/hierarchy.types';
import type { ONBOARDING_STATUS_COLORS, PHASE_PROGRESS_COLORS } from '@/types/recruiting';

const PHASE_NAMES = [
  'Interview 1',
  'Zoom Interview',
  'Pre-Licensing',
  'Exam',
  'NPN Received',
  'Contracting',
  'Bootcamp',
];

export function MyRecruitingPipeline() {
  const { user } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Fetch current user's profile
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  // Fetch upline/trainer info
  const { data: upline } = useQuery<UserProfile | null>({
    queryKey: ['upline', profile?.upline_id],
    queryFn: async () => {
      if (!profile?.upline_id) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, phone, profile_photo_url')
        .eq('id', profile.upline_id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!profile?.upline_id,
  });

  // Fetch phase progress
  const { data: phaseProgress } = useRecruitPhaseProgress(user?.id);
  const { data: currentPhase } = useCurrentPhase(user?.id);

  // Fetch documents
  const { data: documents } = useRecruitDocuments(user?.id);

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!phaseProgress || phaseProgress.length === 0) return 0;
    const completed = phaseProgress.filter((p) => p.status === 'completed').length;
    return Math.round((completed / phaseProgress.length) * 100);
  };

  // Handle photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);

    try {
      // Upload to Supabase Storage
      const fileName = `${user.id}_${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_photo_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh profile
      window.location.reload();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load your profile. Please try refreshing.</p>
        </div>
      </div>
    );
  }

  const progressPercentage = calculateProgress();

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Onboarding Progress</h1>
          <p className="text-muted-foreground">Track your journey to becoming a licensed agent</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {progressPercentage}% Complete
        </Badge>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.profile_photo_url || undefined} alt={profile.first_name || 'User'} />
                <AvatarFallback className="text-2xl">
                  {profile.first_name?.[0]}
                  {profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <label htmlFor="photo-upload">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={uploadingPhoto}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </span>
                </Button>
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {profile.first_name} {profile.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </p>
                <p className="font-medium">{profile.email}</p>
              </div>
              {profile.phone && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </p>
                  <p className="font-medium">{profile.phone}</p>
                </div>
              )}
              {profile.resident_state && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Resident State
                  </p>
                  <p className="font-medium">{profile.resident_state}</p>
                </div>
              )}
              {profile.onboarding_started_at && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Started
                  </p>
                  <p className="font-medium">
                    {format(new Date(profile.onboarding_started_at), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Progress
          </CardTitle>
          <CardDescription>Your journey through the onboarding phases</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Completion Status</span>
              <span className="text-muted-foreground">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          <Separator />

          {/* Phase Timeline */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Onboarding Phases</h4>
            <div className="space-y-2">
              {phaseProgress?.map((phase, index) => {
                const isCompleted = phase.status === 'completed';
                const isInProgress = phase.status === 'in_progress';
                const isBlocked = phase.status === 'blocked';

                return (
                  <div key={phase.id} className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : isInProgress ? (
                      <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                    ) : isBlocked ? (
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{PHASE_NAMES[index] || `Phase ${index + 1}`}</p>
                      {phase.started_at && (
                        <p className="text-xs text-muted-foreground">
                          Started {format(new Date(phase.started_at), 'MMM d, yyyy')}
                        </p>
                      )}
                      {phase.blocked_reason && (
                        <p className="text-xs text-destructive">Blocked: {phase.blocked_reason}</p>
                      )}
                    </div>
                    <Badge
                      variant={isCompleted ? 'default' : isInProgress ? 'secondary' : 'outline'}
                      className="capitalize"
                    >
                      {phase.status.replace('_', ' ')}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Phase & Next Steps */}
      {currentPhase && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Current Phase: {currentPhase.phase_name}
            </CardTitle>
            <CardDescription>What you need to do next</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentPhase.notes && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">{currentPhase.notes}</p>
                </div>
              )}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Next Steps:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Complete required documents for this phase</li>
                  <li>Stay in contact with your trainer</li>
                  <li>Follow the phase checklist items</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Required Documents
          </CardTitle>
          <CardDescription>
            {documents?.length || 0} document{documents?.length !== 1 ? 's' : ''} uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Your trainer will let you know what documents are required</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{doc.document_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge
                    variant={
                      doc.status === 'approved'
                        ? 'default'
                        : doc.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="capitalize"
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upline Contact Card */}
      {upline && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Your Trainer
            </CardTitle>
            <CardDescription>Reach out if you have questions or need help</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={upline.profile_photo_url || undefined} alt={upline.first_name || 'Trainer'} />
                <AvatarFallback>
                  {upline.first_name?.[0]}
                  {upline.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">
                  {upline.first_name} {upline.last_name}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {upline.email}
                </p>
                {upline.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {upline.phone}
                  </p>
                )}
              </div>
              <Button variant="outline" asChild>
                <a href={`mailto:${upline.email}`}>Contact</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!upline && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Your Trainer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              <p>No trainer assigned yet</p>
              <p className="text-sm">An admin will assign you a trainer soon</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
