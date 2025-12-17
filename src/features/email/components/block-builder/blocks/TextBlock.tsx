import { useEffect, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import type { EmailBlock, TextBlockContent } from "@/types/email.types";

// Sanitizer config for email-safe HTML
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "b",
    "i",
    "strong",
    "em",
    "u",
    "a",
    "ul",
    "ol",
    "li",
    "span",
  ],
  ALLOWED_ATTR: ["href", "target", "style", "class"],
};

interface TextBlockProps {
  block: EmailBlock;
  isEditing: boolean;
  onChange: (block: EmailBlock) => void;
}

export interface TextBlockRef {
  insertText: (text: string) => void;
}

export const TextBlock = forwardRef<TextBlockRef, TextBlockProps>(
  function TextBlock({ block, isEditing, onChange }, ref) {
    const content = block.content as TextBlockContent;

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false, // Disable headings for text blocks
        }),
        Link.configure({ openOnClick: false }),
        TextAlign.configure({ types: ["paragraph"] }),
      ],
      content: content.html,
      editable: isEditing,
      onUpdate: ({ editor }) => {
        onChange({
          ...block,
          content: { type: "text", html: editor.getHTML() },
        });
      },
    });

    // Expose insertText method via ref
    useImperativeHandle(
      ref,
      () => ({
        insertText: (text: string) => {
          if (editor && !editor.isDestroyed) {
            editor.chain().focus().insertContent(text).run();
          }
        },
      }),
      [editor],
    );

    // Sync content when block changes externally or isEditing changes
    useEffect(() => {
      if (editor && !editor.isDestroyed) {
        const currentContent = editor.getHTML();
        if (currentContent !== content.html) {
          editor.commands.setContent(content.html);
        }
        editor.setEditable(isEditing);
      }
    }, [editor, content.html, isEditing]);

    if (!isEditing) {
      // Sanitize HTML to prevent XSS
      const sanitizedHtml = DOMPurify.sanitize(
        content.html || "<p>Click to edit text...</p>",
        SANITIZE_CONFIG,
      );
      return (
        <div
          className="prose prose-sm max-w-none p-3"
          style={{
            backgroundColor: block.styles.backgroundColor || "transparent",
            color: block.styles.textColor || "#374151",
            textAlign: block.styles.alignment || "left",
          }}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    }

    // Apply font/color styles to editor container
    const editorStyles = {
      fontFamily: block.styles.fontFamily || "inherit",
      color: block.styles.textColor || "#374151",
      fontSize: block.styles.fontSize || "14px",
      lineHeight: block.styles.lineHeight || "1.5",
    };

    return (
      <div className="p-1.5">
        {/* Toolbar */}
        <div className="mb-1.5 flex items-center gap-0.5 border-b pb-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6", editor?.isActive("bold") && "bg-muted")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6", editor?.isActive("italic") && "bg-muted")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6",
              editor?.isActive("bulletList") && "bg-muted",
            )}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="h-3 w-3" />
          </Button>
          <div className="mx-0.5 h-3 w-px bg-border" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6",
              editor?.isActive({ textAlign: "left" }) && "bg-muted",
            )}
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6",
              editor?.isActive({ textAlign: "center" }) && "bg-muted",
            )}
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6",
              editor?.isActive({ textAlign: "right" }) && "bg-muted",
            )}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-3 w-3" />
          </Button>
        </div>
        {/* Editor - with font styles applied */}
        <div style={editorStyles}>
          <EditorContent
            editor={editor}
            className={cn(
              "prose prose-sm max-w-none",
              "[&_.ProseMirror]:min-h-[60px] [&_.ProseMirror]:outline-none",
              "[&_.ProseMirror]:rounded [&_.ProseMirror]:border [&_.ProseMirror]:border-input",
              "[&_.ProseMirror]:bg-background [&_.ProseMirror]:p-2 [&_.ProseMirror]:text-xs",
              "[&_.ProseMirror:focus]:ring-1 [&_.ProseMirror:focus]:ring-ring/20",
            )}
          />
        </div>
      </div>
    );
  },
);

export function createDefaultTextBlock(id: string): EmailBlock {
  return {
    id,
    type: "text",
    content: {
      type: "text",
      html: "<p>Enter your text here...</p>",
    } as TextBlockContent,
    styles: {
      backgroundColor: "transparent",
      textColor: "#374151",
      alignment: "left",
      padding: "16px",
    },
  };
}
