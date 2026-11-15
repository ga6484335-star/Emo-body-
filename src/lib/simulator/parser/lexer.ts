import type { DiagnosticMessage } from "../types";

export type TokenType =
  | "PREPROCESSOR"
  | "KEYWORD"
  | "IDENTIFIER"
  | "NUMBER"
  | "STRING"
  | "CHAR"
  | "OPERATOR"
  | "PUNCTUATION"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  file: string;
  line: number;
  column: number;
}

export const CPP_KEYWORDS = new Set([
  "void",
  "int",
  "unsigned",
  "signed",
  "long",
  "short",
  "char",
  "byte",
  "bool",
  "boolean",
  "float",
  "double",
  "uint8_t",
  "int8_t",
  "uint16_t",
  "int16_t",
  "uint32_t",
  "int32_t",
  "uint64_t",
  "int64_t",
  "size_t",
  "String",
  "const",
  "constexpr",
  "static",
  "volatile",
  "extern",
  "inline",
  "PROGMEM",
  "IRAM_ATTR",
  "enum",
  "struct",
  "class",
  "public",
  "private",
  "protected",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "default",
  "break",
  "continue",
  "return",
  "true",
  "false",
  "nullptr",
  "NULL",
  "sizeof",
  "typedef",
  "using",
  "namespace",
  "template",
  "typename",
  "new",
  "delete",
  "this",
  "auto",
]);

export const TYPE_KEYWORDS = new Set([
  "void",
  "int",
  "unsigned",
  "signed",
  "long",
  "short",
  "char",
  "byte",
  "bool",
  "boolean",
  "float",
  "double",
  "uint8_t",
  "int8_t",
  "uint16_t",
  "int16_t",
  "uint32_t",
  "int32_t",
  "uint64_t",
  "int64_t",
  "size_t",
  "String",
  "auto",
]);

export const QUALIFIER_KEYWORDS = new Set([
  "const",
  "constexpr",
  "static",
  "volatile",
  "extern",
  "inline",
  "PROGMEM",
  "IRAM_ATTR",
]);

const THREE_CHAR_OPS = new Set(["<<=", ">>="]);
const TWO_CHAR_OPS = new Set([
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "<<",
  ">>",
  "->",
  "::",
]);
const ONE_CHAR_OPS = new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  "=",
  "<",
  ">",
  "!",
  "~",
  "&",
  "|",
  "^",
  "?",
  ":",
  ".",
]);
const PUNCTUATION = new Set(["(", ")", "{", "}", "[", "]", ";", ","]);

export interface LexResult {
  tokens: Token[];
  diagnostics: DiagnosticMessage[];
  lineCount: number;
}

export function tokenizeSource(source: string, file: string): LexResult {
  const tokens: Token[] = [];
  const diagnostics: DiagnosticMessage[] = [];
  let i = 0;
  let line = 1;
  let column = 1;
  let diagCounter = 0;

  const pushError = (msg: string, l: number, c: number) => {
    diagCounter++;
    diagnostics.push({
      id: `lex_${file}_${diagCounter}`,
      severity: "error",
      category: "syntax",
      file,
      line: l,
      column: c,
      message: msg,
    });
  };

  const advance = () => {
    const ch = source[i++];
    if (ch === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
    return ch;
  };

  while (i < source.length) {
    const ch = source[i];

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      advance();
      continue;
    }

    // Line comment
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") {
        advance();
      }
      continue;
    }

    // Block comment
    if (ch === "/" && source[i + 1] === "*") {
      const startLine = line;
      const startCol = column;
      advance();
      advance();
      let closed = false;
      while (i < source.length) {
        if (source[i] === "*" && source[i + 1] === "/") {
          advance();
          advance();
          closed = true;
          break;
        }
        advance();
      }
      if (!closed) {
        pushError("Unterminated block comment '/*'", startLine, startCol);
      }
      continue;
    }

    // Preprocessor directive (#...)
    if (ch === "#") {
      const startLine = line;
      const startCol = column;
      let raw = "";
      while (i < source.length) {
        if (source[i] === "\\" && (source[i + 1] === "\n" || (source[i + 1] === "\r" && source[i + 2] === "\n"))) {
          advance();
          if (source[i] === "\r") advance();
          advance();
          raw += " ";
          continue;
        }
        if (source[i] === "\n") break;
        if (source[i] === "/" && source[i + 1] === "/") {
          while (i < source.length && source[i] !== "\n") advance();
          break;
        }
        if (source[i] === "/" && source[i + 1] === "*") {
          advance();
          advance();
          while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
            advance();
          }
          if (i < source.length) {
            advance();
            advance();
          }
          continue;
        }
        raw += advance();
      }
      tokens.push({
        type: "PREPROCESSOR",
        value: raw.trim(),
        file,
        line: startLine,
        column: startCol,
      });
      continue;
    }

    // String literal
    if (ch === '"') {
      const startLine = line;
      const startCol = column;
      advance(); // consume opening "
      let str = "";
      let closed = false;
      while (i < source.length) {
        const c = source[i];
        if (c === "\n") break;
        if (c === "\\") {
          advance();
          if (i >= source.length) break;
          const esc = advance();
          if (esc === "n") str += "\n";
          else if (esc === "r") str += "\r";
          else if (esc === "t") str += "\t";
          else if (esc === "\\") str += "\\";
          else if (esc === '"') str += '"';
          else if (esc === "0") str += "\0";
          else str += esc;
          continue;
        }
        if (c === '"') {
          advance();
          closed = true;
          break;
        }
        str += advance();
      }
      if (!closed) {
        pushError("Unterminated string literal", startLine, startCol);
      }
      tokens.push({
        type: "STRING",
        value: str,
        file,
        line: startLine,
        column: startCol,
      });
      continue;
    }

    // Char literal
    if (ch === "'") {
      const startLine = line;
      const startCol = column;
      advance();
      let val = "";
      let closed = false;
      while (i < source.length && source[i] !== "\n") {
        if (source[i] === "\\") {
          advance();
          if (i < source.length) {
            const esc = advance();
            if (esc === "n") val += "\n";
            else if (esc === "t") val += "\t";
            else if (esc === "r") val += "\r";
            else if (esc === "0") val += "\0";
            else val += esc;
          }
          continue;
        }
        if (source[i] === "'") {
          advance();
          closed = true;
          break;
        }
        val += advance();
      }
      if (!closed) {
        pushError("Unterminated character literal", startLine, startCol);
      }
      tokens.push({
        type: "CHAR",
        value: val,
        file,
        line: startLine,
        column: startCol,
      });
      continue;
    }

    // Number literal (hex, binary, decimal, float)
    if (/[0-9]/.test(ch) || (ch === "." && i + 1 < source.length && /[0-9]/.test(source[i + 1]))) {
      const startLine = line;
      const startCol = column;
      let num = "";
      if (ch === "0" && (source[i + 1] === "x" || source[i + 1] === "X")) {
        num += advance();
        num += advance();
        while (i < source.length && /[0-9a-fA-F_]/.test(source[i])) {
          num += advance();
        }
      } else if (ch === "0" && (source[i + 1] === "b" || source[i + 1] === "B")) {
        num += advance();
        num += advance();
        while (i < source.length && /[01_]/.test(source[i])) {
          num += advance();
        }
      } else {
        let hasDot = false;
        while (i < source.length && (/[0-9]/.test(source[i]) || (!hasDot && source[i] === "."))) {
          if (source[i] === ".") hasDot = true;
          num += advance();
        }
        if (i < source.length && (source[i] === "e" || source[i] === "E")) {
          num += advance();
          if (i < source.length && (source[i] === "+" || source[i] === "-")) {
            num += advance();
          }
          while (i < source.length && /[0-9]/.test(source[i])) {
            num += advance();
          }
        }
      }
      // Consume integer/float suffixes like UL, U, L, f, F
      while (i < source.length && /[uUlLfF]/.test(source[i])) {
        num += advance();
      }
      tokens.push({
        type: "NUMBER",
        value: num,
        file,
        line: startLine,
        column: startCol,
      });
      continue;
    }

    // Identifier or Keyword
    if (/[a-zA-Z_]/.test(ch)) {
      const startLine = line;
      const startCol = column;
      let ident = "";
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
        ident += advance();
      }
      // Arduino binary macro like B10101010
      if (/^B[01]{8}$/.test(ident)) {
        tokens.push({
          type: "NUMBER",
          value: "0b" + ident.slice(1),
          file,
          line: startLine,
          column: startCol,
        });
        continue;
      }
      tokens.push({
        type: CPP_KEYWORDS.has(ident) ? "KEYWORD" : "IDENTIFIER",
        value: ident,
        file,
        line: startLine,
        column: startCol,
      });
      continue;
    }

    // Operators (3-char, 2-char, 1-char)
    const three = source.slice(i, i + 3);
    if (THREE_CHAR_OPS.has(three)) {
      const startLine = line;
      const startCol = column;
      advance();
      advance();
      advance();
      tokens.push({ type: "OPERATOR", value: three, file, line: startLine, column: startCol });
      continue;
    }

    const two = source.slice(i, i + 2);
    if (TWO_CHAR_OPS.has(two)) {
      const startLine = line;
      const startCol = column;
      advance();
      advance();
      tokens.push({ type: "OPERATOR", value: two, file, line: startLine, column: startCol });
      continue;
    }

    if (ONE_CHAR_OPS.has(ch)) {
      const startLine = line;
      const startCol = column;
      advance();
      tokens.push({ type: "OPERATOR", value: ch, file, line: startLine, column: startCol });
      continue;
    }

    if (PUNCTUATION.has(ch)) {
      const startLine = line;
      const startCol = column;
      advance();
      tokens.push({ type: "PUNCTUATION", value: ch, file, line: startLine, column: startCol });
      continue;
    }

    // Unrecognized character
    const badLine = line;
    const badCol = column;
    const bad = advance();
    pushError(`Unexpected character '${bad}'`, badLine, badCol);
  }

  tokens.push({ type: "EOF", value: "", file, line, column });
  return {
    tokens,
    diagnostics,
    lineCount: source.length === 0 ? 0 : source.split("\n").length,
  };
}
