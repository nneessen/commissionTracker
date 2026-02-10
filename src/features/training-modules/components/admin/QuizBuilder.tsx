// src/features/training-modules/components/admin/QuizBuilder.tsx
import { useState } from "react";
import {
  Plus,
  Loader2,
  Trash2,
  GripVertical,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useTrainingQuiz,
  useCreateQuiz,
  useUpdateQuiz,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useCreateOption,
  useUpdateOption,
  useDeleteOption,
} from "../../hooks/useTrainingQuizzes";
import { QUESTION_TYPES } from "../../types/training-module.types";
import type {
  TrainingQuizQuestion,
  TrainingQuizOption,
  QuestionType,
} from "../../types/training-module.types";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
};

interface QuizBuilderProps {
  lessonId: string;
}

export function QuizBuilder({ lessonId }: QuizBuilderProps) {
  const { data: quiz, isLoading } = useTrainingQuiz(lessonId);
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-6 space-y-2">
        <p className="text-[11px] text-zinc-500">
          No quiz created for this lesson yet.
        </p>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            createQuiz.mutate({ lesson_id: lessonId })
          }
          disabled={createQuiz.isPending}
        >
          {createQuiz.isPending ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Plus className="h-3 w-3 mr-1" />
          )}
          Create Quiz
        </Button>
      </div>
    );
  }

  const updateField = (field: string, value: unknown) => {
    updateQuiz.mutate({
      id: quiz.id,
      lessonId,
      input: { [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      {/* Quiz Settings */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Quiz Settings
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">
              Pass Threshold (%)
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              value={quiz.pass_threshold}
              onChange={(e) =>
                updateField("pass_threshold", Number(e.target.value) || 70)
              }
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">Max Attempts</label>
            <Input
              type="number"
              min={1}
              value={quiz.max_attempts}
              onChange={(e) =>
                updateField("max_attempts", Number(e.target.value) || 3)
              }
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">
              Time Limit (min)
            </label>
            <Input
              type="number"
              value={quiz.time_limit_minutes || ""}
              onChange={(e) =>
                updateField(
                  "time_limit_minutes",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className="h-7 text-xs"
              placeholder="None"
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={quiz.shuffle_questions}
              onChange={(e) =>
                updateField("shuffle_questions", e.target.checked)
              }
              className="h-3 w-3 rounded"
            />
            Shuffle Questions
          </label>
          <label className="flex items-center gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={quiz.shuffle_options}
              onChange={(e) =>
                updateField("shuffle_options", e.target.checked)
              }
              className="h-3 w-3 rounded"
            />
            Shuffle Options
          </label>
          <label className="flex items-center gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={quiz.show_correct_answers}
              onChange={(e) =>
                updateField("show_correct_answers", e.target.checked)
              }
              className="h-3 w-3 rounded"
            />
            Show Answers
          </label>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">
              Perfect Score XP
            </label>
            <Input
              type="number"
              value={quiz.xp_bonus_perfect}
              onChange={(e) =>
                updateField("xp_bonus_perfect", Number(e.target.value) || 0)
              }
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-200 dark:border-zinc-800" />

      {/* Questions */}
      <QuestionList
        quizId={quiz.id}
        lessonId={lessonId}
        questions={quiz.questions || []}
      />
    </div>
  );
}

function QuestionList({
  quizId,
  lessonId,
  questions,
}: {
  quizId: string;
  lessonId: string;
  questions: TrainingQuizQuestion[];
}) {
  const createQuestion = useCreateQuestion();

  const handleAddQuestion = () => {
    createQuestion.mutate({
      input: {
        quiz_id: quizId,
        question_text: "New Question",
        question_type: "multiple_choice",
        sort_order: questions.length,
        points: 1,
      },
      lessonId,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Questions ({questions.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px]"
          onClick={handleAddQuestion}
          disabled={createQuestion.isPending}
        >
          {createQuestion.isPending ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Plus className="h-3 w-3 mr-1" />
          )}
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-4 text-[10px] text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
          No questions yet. Add one above.
        </div>
      ) : (
        <div className="space-y-2">
          {questions
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={index}
                lessonId={lessonId}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  lessonId,
}: {
  question: TrainingQuizQuestion;
  index: number;
  lessonId: string;
}) {
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const [expanded, setExpanded] = useState(true);

  const update = (field: string, value: unknown) => {
    updateQuestion.mutate({
      id: question.id,
      lessonId,
      input: { [field]: value },
    });
  };

  const handleDelete = () => {
    if (!window.confirm("Delete this question and all its options?")) return;
    deleteQuestion.mutate({ id: question.id, lessonId });
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900">
      {/* Question header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="h-3 w-3 text-zinc-300 flex-shrink-0" />
        <span className="text-[10px] font-bold text-zinc-400 flex-shrink-0">
          Q{index + 1}
        </span>
        <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate flex-1">
          {question.question_text}
        </span>
        <span className="text-[9px] text-zinc-400">
          {question.points}pt{question.points !== 1 ? "s" : ""}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
        >
          <Trash2 className="h-3 w-3 text-zinc-400 hover:text-red-500" />
        </button>
      </div>

      {expanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-2">
          {/* Question text */}
          <Input
            value={question.question_text}
            onChange={(e) => update("question_text", e.target.value)}
            className="h-7 text-xs"
            placeholder="Question text"
          />

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500">Type</label>
              <select
                value={question.question_type}
                onChange={(e) => update("question_type", e.target.value)}
                className="w-full h-7 text-xs border border-zinc-200 dark:border-zinc-700 rounded-md px-2 bg-white dark:bg-zinc-900"
              >
                {QUESTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {QUESTION_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500">Points</label>
              <Input
                type="number"
                min={1}
                value={question.points}
                onChange={(e) =>
                  update("points", Number(e.target.value) || 1)
                }
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500">Explanation</label>
              <Input
                value={question.explanation || ""}
                onChange={(e) =>
                  update("explanation", e.target.value || null)
                }
                className="h-7 text-xs"
                placeholder="Shown after answer"
              />
            </div>
          </div>

          {/* Options */}
          <OptionList
            questionId={question.id}
            lessonId={lessonId}
            options={question.options || []}
            questionType={question.question_type as QuestionType}
          />
        </div>
      )}
    </div>
  );
}

function OptionList({
  questionId,
  lessonId,
  options,
  questionType,
}: {
  questionId: string;
  lessonId: string;
  options: TrainingQuizOption[];
  questionType: QuestionType;
}) {
  const createOption = useCreateOption();
  const updateOption = useUpdateOption();
  const deleteOption = useDeleteOption();

  const handleAddOption = () => {
    createOption.mutate({
      input: {
        question_id: questionId,
        option_text:
          questionType === "true_false"
            ? options.length === 0
              ? "True"
              : "False"
            : "",
        is_correct: false,
        sort_order: options.length,
      },
      lessonId,
    });
  };

  const handleToggleCorrect = (option: TrainingQuizOption) => {
    updateOption.mutate({
      id: option.id,
      lessonId,
      input: { is_correct: !option.is_correct },
    });
  };

  const handleUpdateText = (optionId: string, text: string) => {
    updateOption.mutate({
      id: optionId,
      lessonId,
      input: { option_text: text },
    });
  };

  const handleDelete = (optionId: string) => {
    deleteOption.mutate({ id: optionId, lessonId });
  };

  const sorted = [...options].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-zinc-500">
          Options
        </label>
        {questionType !== "true_false" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[9px] px-1"
            onClick={handleAddOption}
            disabled={createOption.isPending}
          >
            {createOption.isPending ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <Plus className="h-2.5 w-2.5 mr-0.5" />
            )}
            Add
          </Button>
        )}
      </div>

      {sorted.map((option) => (
        <div key={option.id} className="flex items-center gap-1.5">
          <button
            onClick={() => handleToggleCorrect(option)}
            className="flex-shrink-0"
            title={option.is_correct ? "Correct answer" : "Mark as correct"}
          >
            {option.is_correct ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-zinc-300" />
            )}
          </button>
          <Input
            value={option.option_text}
            onChange={(e) => handleUpdateText(option.id, e.target.value)}
            className="h-6 text-[11px] flex-1"
            placeholder="Option text"
          />
          {questionType !== "true_false" && (
            <button onClick={() => handleDelete(option.id)}>
              <Trash2 className="h-3 w-3 text-zinc-400 hover:text-red-500" />
            </button>
          )}
        </div>
      ))}

      {/* Auto-create True/False options if missing */}
      {questionType === "true_false" && options.length === 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] w-full"
          onClick={() => {
            createOption.mutate({
              input: {
                question_id: questionId,
                option_text: "True",
                is_correct: true,
                sort_order: 0,
              },
              lessonId,
            });
            createOption.mutate({
              input: {
                question_id: questionId,
                option_text: "False",
                is_correct: false,
                sort_order: 1,
              },
              lessonId,
            });
          }}
          disabled={createOption.isPending}
        >
          Create True/False Options
        </Button>
      )}
    </div>
  );
}
