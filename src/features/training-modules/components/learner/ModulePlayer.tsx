import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrainingModule } from "../../hooks/useTrainingModules";
import { useTrainingLessons } from "../../hooks/useTrainingLessons";
import {
  useModuleProgressSummary,
  useStartLesson,
  useCompleteLesson,
} from "../../hooks/useTrainingProgress";
import { LessonViewer } from "./LessonViewer";
import { ProgressBar } from "../shared/ProgressBar";

interface ModulePlayerProps {
  moduleId: string;
}

export default function ModulePlayer({ moduleId }: ModulePlayerProps) {
  const navigate = useNavigate();

  const { data: module, isLoading: moduleLoading } =
    useTrainingModule(moduleId);
  const { data: lessons = [] } = useTrainingLessons(moduleId);
  const { data: progressSummary = [] } = useModuleProgressSummary(moduleId);
  const startLesson = useStartLesson();
  const completeLesson = useCompleteLesson();

  const [currentIndex, setCurrentIndex] = useState(0);
  const lessonStartTime = useRef(Date.now());

  const currentLesson = lessons[currentIndex];
  const currentProgress = progressSummary.find(
    (p) => p.lesson_id === currentLesson?.id,
  );
  const completedCount = progressSummary.filter(
    (p) => p.status === "completed",
  ).length;

  useEffect(() => {
    if (currentLesson && moduleId) {
      lessonStartTime.current = Date.now();
      startLesson.mutate({ lessonId: currentLesson.id, moduleId });
    }
    // Only trigger when the lesson id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.id]);

  const handleCompleteLesson = useCallback(async () => {
    if (!currentLesson) return;
    const timeSpent = Math.round((Date.now() - lessonStartTime.current) / 1000);
    await completeLesson.mutateAsync({
      lessonId: currentLesson.id,
      timeSpentSeconds: timeSpent,
    });

    // Auto-advance to next lesson
    if (currentIndex < lessons.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [
    currentLesson,
    completeLesson,
    currentIndex,
    lessons.length,
  ]);

  if (moduleLoading || !module) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => navigate({ to: "/my-training" as string })}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {module.title}
          </h1>
          <div className="flex items-center gap-2">
            <ProgressBar
              value={completedCount}
              max={lessons.length}
              className="w-32"
            />
            <span className="text-[10px] text-zinc-500">
              {completedCount}/{lessons.length} lessons
            </span>
          </div>
        </div>
      </div>

      {/* Lesson navigation sidebar + content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lesson nav sidebar */}
        <div className="w-52 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto p-2">
          {lessons.map((lesson, index) => {
            const prog = progressSummary.find((p) => p.lesson_id === lesson.id);
            const isComplete = prog?.status === "completed";
            const isCurrent = index === currentIndex;

            return (
              <button
                key={lesson.id}
                onClick={() => setCurrentIndex(index)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[11px] mb-0.5 transition-colors ${
                  isCurrent
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0 flex items-center justify-center text-[8px]">
                    {index + 1}
                  </span>
                )}
                <span className="truncate">{lesson.title}</span>
              </button>
            );
          })}
        </div>

        {/* Lesson content */}
        <div className="flex-1 overflow-y-auto">
          {currentLesson && <LessonViewer lessonId={currentLesson.id} />}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
        >
          <ChevronLeft className="h-3 w-3 mr-1" /> Previous
        </Button>

        {completedCount === lessons.length && lessons.length > 0 ? (
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => navigate({ to: "/my-training" as string })}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Module Complete — Back to Training
          </Button>
        ) : (
          currentProgress?.status !== "completed" &&
          currentLesson?.lesson_type !== "quiz" && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleCompleteLesson}
              disabled={completeLesson.isPending}
            >
              {completeLesson.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              )}
              Mark Complete
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={currentIndex >= lessons.length - 1}
          onClick={() => setCurrentIndex(currentIndex + 1)}
        >
          Next <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
