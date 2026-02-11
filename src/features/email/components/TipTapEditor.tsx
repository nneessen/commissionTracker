// src/features/email/components/TipTapEditor.tsx

import {useEditor, EditorContent} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {TipTapMenuBar} from './TipTapMenuBar'
import {useEffect, useRef} from 'react'
import {sanitizeHtml} from '../services/sanitizationService'

interface TipTapEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
  editable?: boolean
  showMenuBar?: boolean
  minHeight?: string
  className?: string
}

/**
 * WYSIWYG rich text editor using TipTap
 * Supports: Bold, Italic, Underline, Links, Lists, Paragraphs
 */
export function TipTapEditor({
  content = '',
  onChange,
  placeholder = 'Type your message here...',
  editable = true,
  showMenuBar = true,
  minHeight = '200px',
  className = '',
}: TipTapEditorProps) {
  // Track the last HTML emitted by the editor to avoid resetting cursor
  // when our own output flows back as the content prop
  const lastEmittedHtmlRef = useRef<string>(content)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default heading shortcuts (we're not using headings in emails)
        heading: false,
        // Enable bullet and ordered lists
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2',
        role: 'textbox',
        'aria-label': 'Email message editor',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Sanitize HTML before passing to parent
      const sanitized = sanitizeHtml(html)
      lastEmittedHtmlRef.current = sanitized
      onChange?.(sanitized)
    },
  })

  // Update editor content when prop changes from an external source
  // (draft loading, template insertion, switching blocks).
  // Skip if the content matches what we last emitted — that means our
  // own output is flowing back through the parent, and calling setContent
  // would reset the cursor position.
  useEffect(() => {
    if (editor && content !== editor.getHTML() && content !== lastEmittedHtmlRef.current) {
      editor.commands.setContent(content)
      lastEmittedHtmlRef.current = content
    }
  }, [content, editor])

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable)
    }
  }, [editable, editor])

  if (!editor) {
    return <div className="animate-pulse h-[200px] bg-muted rounded-md" />
  }

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      {showMenuBar && <TipTapMenuBar editor={editor} />}

      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:p-4"
      />

      {/* Character count */}
      <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
        {editor.getHTML().length} characters
      </div>
    </div>
  )
}
