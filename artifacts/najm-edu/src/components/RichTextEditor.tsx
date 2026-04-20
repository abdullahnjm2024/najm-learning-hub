import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Link as LinkIcon, Undo, Redo, Minus
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  dir?: "rtl" | "ltr";
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, dir = "rtl", placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-500 underline" } }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "min-h-[140px] outline-none text-sm text-foreground leading-relaxed",
        dir,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value]);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-1.5 rounded text-xs transition-all ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-input">
      <div className="flex items-center gap-0.5 flex-wrap p-2 border-b border-border bg-muted/40">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="Bold"><Bold className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="Italic"><Italic className="w-3.5 h-3.5" /></button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }))} title="Heading 2"><Heading2 className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }))} title="Heading 3"><Heading3 className="w-3.5 h-3.5" /></button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="Bullet List"><List className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="Ordered List"><ListOrdered className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)} title="Divider"><Minus className="w-3.5 h-3.5" /></button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button type="button"
          onClick={() => {
            const url = window.prompt("رابط URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
            else editor.chain().focus().unsetLink().run();
          }}
          className={btn(editor.isActive("link"))} title="Link"><LinkIcon className="w-3.5 h-3.5" /></button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btn(false) + " disabled:opacity-30"} title="Undo"><Undo className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btn(false) + " disabled:opacity-30"} title="Redo"><Redo className="w-3.5 h-3.5" /></button>
      </div>
      <div className="p-3 relative" dir={dir}>
        {!value && (
          <p className="absolute top-3 right-3 text-muted-foreground text-sm pointer-events-none select-none" dir={dir}>{placeholder}</p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
