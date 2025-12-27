// src/features/recruiting/components/interactive/QuizItem.tsx

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import type { QuizMetadata, QuizResponse } from "@/types/recruiting.types";
import { checklistResponseService } from "@/services/recruiting/checklistResponseService";

interface QuizItemProps {
  progressId: string;
  metadata: QuizMetadata;
  existingResponse?: QuizResponse | null;
  onComplete?: () => void;
}

export function QuizItem({
  progressId,
  metadata,
  existingResponse,
  onComplete,
}: QuizItemProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [lastAttemptResult, setLastAttemptResult] = useState<{
    passed: boolean;
    score: number;
    canRetry: boolean;
    attemptsRemaining: number | null;
  } | null>(null);

  // Shuffle questions if configured
  const questions = useMemo(() => {
    if (metadata.randomize_questions) {
      return [...metadata.questions].sort(() => Math.random() - 0.5);
    }
    return metadata.questions;
  }, [metadata.questions, metadata.randomize_questions]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Shuffle options if configured
  const displayOptions = useMemo(() => {
    if (metadata.randomize_options) {
      return [...currentQuestion.options].sort(() => Math.random() - 0.5);
    }
    return currentQuestion.options;
  }, [currentQuestion.options, metadata.randomize_options]);

  const handleToggleOption = useCallback(
    (questionId: string, optionId: string, allowMultiple: boolean) => {
      setAnswers((prev) => {
        const current = prev[questionId] ?? [];
        if (allowMultiple) {
          if (current.includes(optionId)) {
            return {
              ...prev,
              [questionId]: current.filter((id) => id !== optionId),
            };
          }
          return { ...prev, [questionId]: [...current, optionId] };
        }
        return { ...prev, [questionId]: [optionId] };
      });
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    }
  }, [currentQuestionIndex, totalQuestions]);

  const handlePrev = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    }
  }, [currentQuestionIndex]);

  const handleSubmitQuiz = useCallback(async () => {
    // Check all questions answered
    const unanswered = questions.filter((q) => !answers[q.id]?.length);
    if (unanswered.length > 0) {
      toast.error(
        `Please answer all questions (${unanswered.length} remaining)`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await checklistResponseService.submitQuizAttempt(
        progressId,
        answers,
        metadata,
      );

      if (!result.success) {
        toast.error(result.error || "Failed to submit quiz");
        return;
      }

      const details = result.completionDetails as {
        score_percent: number;
        passed: boolean;
        can_retry: boolean;
        attempts_remaining: number | null;
      };

      setLastAttemptResult({
        passed: details.passed,
        score: details.score_percent,
        canRetry: details.can_retry,
        attemptsRemaining: details.attempts_remaining,
      });
      setShowResults(true);

      if (details.passed) {
        toast.success(`Quiz passed with ${details.score_percent}%!`);
        onComplete?.();
      } else if (details.can_retry) {
        toast.info(
          `Score: ${details.score_percent}%. Required: ${metadata.passing_score_percent}%. You can retry.`,
        );
      } else {
        toast.error(
          `Score: ${details.score_percent}%. Required: ${metadata.passing_score_percent}%. No more retries.`,
        );
      }
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      toast.error("Failed to submit quiz");
    } finally {
      setIsSubmitting(false);
    }
  }, [progressId, answers, questions, metadata, onComplete]);

  const handleRetry = useCallback(() => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setLastAttemptResult(null);
  }, []);

  // If already passed
  if (existingResponse?.passed) {
    return (
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            Quiz passed with {existingResponse.best_score_percent}% (
            {existingResponse.total_attempts} attempt
            {existingResponse.total_attempts !== 1 ? "s" : ""})
          </span>
        </div>
      </div>
    );
  }

  // Show results screen
  if (showResults && lastAttemptResult) {
    return (
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
        <div className="text-center py-4">
          {lastAttemptResult.passed ? (
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          ) : (
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          )}
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {lastAttemptResult.passed ? "Quiz Passed!" : "Quiz Not Passed"}
          </h3>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {lastAttemptResult.score}%
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            Required: {metadata.passing_score_percent}%
          </p>
        </div>

        {lastAttemptResult.canRetry && (
          <div className="text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              {lastAttemptResult.attemptsRemaining !== null
                ? `${lastAttemptResult.attemptsRemaining} attempt(s) remaining`
                : "Unlimited retries available"}
            </p>
            <Button onClick={handleRetry} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {!lastAttemptResult.passed && !lastAttemptResult.canRetry && (
          <p className="text-center text-sm text-red-600 dark:text-red-400">
            No more attempts available. Please contact your recruiter.
          </p>
        )}
      </div>
    );
  }

  const currentAnswers = answers[currentQuestion.id] ?? [];
  const hasMultipleCorrect =
    currentQuestion.options.filter((o) => o.is_correct).length > 1;

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
      {/* Quiz header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {metadata.title}
        </h3>
        <Badge variant="outline" className="text-xs">
          {metadata.passing_score_percent}% to pass
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <span>
            {Object.keys(answers).length} of {totalQuestions} answered
          </span>
        </div>
        <Progress
          value={((currentQuestionIndex + 1) / totalQuestions) * 100}
          className="h-1"
        />
      </div>

      {/* Question */}
      <div className="py-2">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
          {currentQuestion.question_text}
        </p>
        {hasMultipleCorrect && (
          <p className="text-xs text-zinc-500 mb-2">Select all that apply</p>
        )}

        {/* Options */}
        <div className="space-y-2">
          {displayOptions.map((option) => {
            const isSelected = currentAnswers.includes(option.id);

            return (
              <div
                key={option.id}
                className={`flex items-start gap-3 p-2 rounded border cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary/10 border-primary"
                    : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                }`}
                onClick={() =>
                  handleToggleOption(
                    currentQuestion.id,
                    option.id,
                    hasMultipleCorrect,
                  )
                }
              >
                {hasMultipleCorrect ? (
                  <Checkbox checked={isSelected} className="mt-0.5" />
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                )}
                <span className="text-sm text-zinc-900 dark:text-zinc-100">
                  {option.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {currentQuestionIndex === totalQuestions - 1 ? (
          <Button
            onClick={handleSubmitQuiz}
            disabled={
              isSubmitting || Object.keys(answers).length < totalQuestions
            }
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Quiz
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Time limit note */}
      {metadata.time_limit_minutes && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
          Time limit: {metadata.time_limit_minutes} minutes
        </p>
      )}
    </div>
  );
}
