"use client";

import React, { useEffect, useImperativeHandle, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, redo, undo } from "@codemirror/commands";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import { openSearchPanel, searchKeymap } from "@codemirror/search";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import type { DiagnosticMessage } from "@/lib/simulator/types";

export interface CppCodeEditorHandle {
  undo: () => void;
  redo: () => void;
  openSearch: () => void;
  scrollToLine: (line: number) => void;
}

interface CppCodeEditorProps {
  value: string;
  onChange: (next: string) => void;
  diagnostics: DiagnosticMessage[];
  fontSize: number;
  themeMode: "oled-dark" | "one-dark" | "high-contrast";
  jumpLine?: { line: number; seq: number } | null;
}

export const CppCodeEditor = React.forwardRef<CppCodeEditorHandle, CppCodeEditorProps>(
  function CppCodeEditor({ value, onChange, diagnostics, fontSize, themeMode, jumpLine }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const diagRef = useRef(diagnostics);

    onChangeRef.current = onChange;
    diagRef.current = diagnostics;

    useImperativeHandle(ref, () => ({
      undo: () => {
        if (viewRef.current) undo(viewRef.current);
      },
      redo: () => {
        if (viewRef.current) redo(viewRef.current);
      },
      openSearch: () => {
        if (viewRef.current) openSearchPanel(viewRef.current);
      },
      scrollToLine: (line: number) => {
        const view = viewRef.current;
        if (!view) return;
        const maxLine = view.state.doc.lines;
        const clamped = Math.max(1, Math.min(maxLine, line));
        const info = view.state.doc.line(clamped);
        view.dispatch({
          selection: { anchor: info.from },
          effects: EditorView.scrollIntoView(info.from, { y: "center" }),
        });
        view.focus();
      },
    }));

    useEffect(() => {
      const parent = containerRef.current;
      if (!parent) return;

      const bgColor =
        themeMode === "high-contrast"
          ? "#020408"
          : themeMode === "one-dark"
          ? "#161B26"
          : "#080C13";

      const customTheme = EditorView.theme({
        "&": {
          fontSize: `${fontSize}px`,
          backgroundColor: bgColor,
          height: "100%",
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: "var(--font-mono), monospace",
        },
        ".cm-content": {
          padding: "10px 0",
        },
      });

      const diagLinter = linter((view) => {
        const items: Diagnostic[] = [];
        const doc = view.state.doc;
        for (const d of diagRef.current) {
          if (d.line < 1 || d.line > doc.lines) continue;
          const lineObj = doc.line(d.line);
          const from = Math.min(lineObj.to, lineObj.from + Math.max(0, d.column - 1));
          const to = Math.max(from + 1, lineObj.to);
          items.push({
            from: Math.min(from, doc.length),
            to: Math.min(to, doc.length),
            severity: d.severity === "error" ? "error" : d.severity === "warning" ? "warning" : "info",
            message: d.message,
          });
        }
        return items;
      });

      const state = EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          bracketMatching(),
          indentOnInput(),
          cpp(),
          oneDark,
          customTheme,
          lintGutter(),
          diagLinter,
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      });

      const view = new EditorView({ state, parent });
      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // Recreate view when theme or fontSize changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fontSize, themeMode]);

    // Sync external file switches into CodeMirror without resetting cursor on own edits
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const cur = view.state.doc.toString();
      if (cur !== value) {
        view.dispatch({
          changes: { from: 0, to: cur.length, insert: value },
        });
      }
    }, [value]);

    // Handle jumpToLine requests
    useEffect(() => {
      if (!jumpLine || !viewRef.current) return;
      const view = viewRef.current;
      const clamped = Math.max(1, Math.min(view.state.doc.lines, jumpLine.line));
      const info = view.state.doc.line(clamped);
      view.dispatch({
        selection: { anchor: info.from },
        effects: EditorView.scrollIntoView(info.from, { y: "center" }),
      });
    }, [jumpLine]);

    return <div ref={containerRef} className="w-full h-full min-h-[340px]" />;
  }
);
