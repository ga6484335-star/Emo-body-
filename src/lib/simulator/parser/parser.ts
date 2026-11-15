import type { DiagnosticMessage, FirmwareFileData } from "../types";
import {
  QUALIFIER_KEYWORDS,
  TYPE_KEYWORDS,
  tokenizeSource,
  type Token,
} from "./lexer";
import type {
  BlockStmt,
  DefineDirective,
  EnumDecl,
  EnumMember,
  Expression,
  FunctionDecl,
  IncludeDirective,
  ParamDecl,
  ParsedProgram,
  Statement,
  StructOrClassDecl,
  SwitchCase,
  TopLevelDecl,
  UnsupportedNode,
  VarDecl,
} from "./ast";

const BUILTIN_CLASS_TYPES = new Set([
  "Adafruit_SSD1306",
  "Adafruit_GFX",
  "Preferences",
  "Servo",
  "WiFiClient",
  "WiFiServer",
  "HTTPClient",
  "BluetoothSerial",
  "BLEDevice",
  "BLEServer",
  "MPU6050",
  "TwoWire",
  "SPIClass",
  "SPISettings",
  "File",
  "Ticker",
  "HardwareSerial",
  "hw_timer_t",
  "TaskHandle_t",
  "QueueHandle_t",
  "SemaphoreHandle_t",
  "sensors_event_t",
  "IPAddress",
  "CRGB",
]);

function parseNumberValue(raw: string): number {
  const cleaned = raw.replace(/_/g, "").replace(/[uUlLfF]+$/, "");
  if (cleaned.startsWith("0x") || cleaned.startsWith("0X")) {
    return parseInt(cleaned.slice(2), 16) || 0;
  }
  if (cleaned.startsWith("0b") || cleaned.startsWith("0B")) {
    return parseInt(cleaned.slice(2), 2) || 0;
  }
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

class SingleFileParser {
  private tokens: Token[];
  private pos = 0;
  private file: string;
  private knownTypes: Set<string>;
  public diagnostics: DiagnosticMessage[] = [];
  public includes: IncludeDirective[] = [];
  public defines: DefineDirective[] = [];
  public declarations: TopLevelDecl[] = [];
  public parsedCount = 0;
  public unsupportedCount = 0;
  public invalidCount = 0;
  private diagSeq = 0;

  constructor(tokens: Token[], file: string, knownTypes: Set<string>) {
    this.tokens = tokens;
    this.file = file;
    this.knownTypes = knownTypes;
  }

  private peek(offset = 0): Token {
    const idx = this.pos + offset;
    if (idx >= this.tokens.length) return this.tokens[this.tokens.length - 1];
    return this.tokens[idx];
  }

  private advance(): Token {
    const t = this.peek();
    if (t.type !== "EOF") this.pos++;
    return t;
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private check(value: string, type?: Token["type"]): boolean {
    const t = this.peek();
    if (type && t.type !== type) return false;
    return t.value === value;
  }

  private match(value: string, type?: Token["type"]): boolean {
    if (this.check(value, type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private addDiag(
    severity: DiagnosticMessage["severity"],
    category: DiagnosticMessage["category"],
    message: string,
    token?: Token,
    suggestion?: string
  ) {
    const t = token ?? this.peek();
    this.diagSeq++;
    this.diagnostics.push({
      id: `parse_${this.file}_${this.diagSeq}`,
      severity,
      category,
      file: t.file || this.file,
      line: t.line,
      column: t.column,
      message,
      suggestion,
    });
  }

  private expect(value: string, message?: string): Token | null {
    if (this.check(value)) {
      return this.advance();
    }
    const t = this.peek();
    this.invalidCount++;
    this.addDiag(
      "error",
      "syntax",
      message ?? `Expected '${value}', found '${t.value || "EOF"}'`,
      t
    );
    return null;
  }

  private synchronizeTopLevel() {
    while (!this.isAtEnd()) {
      const t = this.peek();
      if (t.value === ";") {
        this.advance();
        return;
      }
      if (t.value === "}") {
        this.advance();
        return;
      }
      if (
        t.type === "PREPROCESSOR" ||
        t.value === "void" ||
        t.value === "enum" ||
        t.value === "struct" ||
        t.value === "class"
      ) {
        return;
      }
      this.advance();
    }
  }

  private synchronizeStatement() {
    while (!this.isAtEnd()) {
      const t = this.peek();
      if (t.value === ";") {
        this.advance();
        return;
      }
      if (t.value === "}") {
        return;
      }
      if (
        t.value === "if" ||
        t.value === "for" ||
        t.value === "while" ||
        t.value === "switch" ||
        t.value === "return"
      ) {
        return;
      }
      this.advance();
    }
  }

  public parse(): void {
    // First pass quick scan for enum/struct/class/typedef names so forward references resolve
    for (let i = 0; i < this.tokens.length - 1; i++) {
      const cur = this.tokens[i];
      if (cur.type === "KEYWORD" && (cur.value === "enum" || cur.value === "struct" || cur.value === "class")) {
        let next = this.tokens[i + 1];
        if (next && next.value === "class" && i + 2 < this.tokens.length) {
          next = this.tokens[i + 2];
        }
        if (next && next.type === "IDENTIFIER") {
          this.knownTypes.add(next.value);
        }
      }
    }

    while (!this.isAtEnd()) {
      const startPos = this.pos;
      try {
        const decls = this.parseTopLevel();
        for (const d of decls) {
          this.declarations.push(d);
        }
      } catch {
        this.invalidCount++;
        this.synchronizeTopLevel();
      }
      if (this.pos === startPos && !this.isAtEnd()) {
        const stuck = this.advance();
        this.invalidCount++;
        this.addDiag("error", "syntax", `Unexpected token '${stuck.value}' at top level`, stuck);
      }
    }
  }

  private parseTopLevel(): TopLevelDecl[] {
    const t = this.peek();

    if (t.type === "PREPROCESSOR") {
      this.advance();
      return this.parsePreprocessor(t);
    }

    if (t.value === ";") {
      this.advance();
      return [];
    }

    if (t.value === "enum") {
      return [this.parseEnum()];
    }

    if (t.value === "struct" || t.value === "class") {
      return [this.parseStructOrClass()];
    }

    if (t.value === "typedef" || t.value === "using" || t.value === "namespace" || t.value === "template") {
      return [this.parseUnsupportedTopLevel()];
    }

    if (this.looksLikeTypeStart(this.pos)) {
      return this.parseDeclOrFunction();
    }

    // Fallback: unrecognized top-level token
    this.invalidCount++;
    this.addDiag("error", "syntax", `Unexpected token '${t.value}' outside function or declaration`, t);
    this.advance();
    this.synchronizeTopLevel();
    return [];
  }

  private parsePreprocessor(token: Token): TopLevelDecl[] {
    const raw = token.value.slice(1).trim();
    const incMatch = raw.match(/^include\s*(<([^>]+)>|"([^"]+)")/);
    if (incMatch) {
      const isLocal = Boolean(incMatch[3]);
      const header = incMatch[2] || incMatch[3] || "";
      const node: IncludeDirective = {
        kind: "Include",
        header,
        isLocal,
        file: token.file,
        line: token.line,
        column: token.column,
      };
      this.includes.push(node);
      this.parsedCount++;
      return [node];
    }

    const defFuncMatch = raw.match(/^define\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)\s*(.*)$/);
    if (defFuncMatch) {
      const node: DefineDirective = {
        kind: "Define",
        name: defFuncMatch[1],
        params: defFuncMatch[2].split(",").map((s) => s.trim()).filter(Boolean),
        value: defFuncMatch[3].trim(),
        file: token.file,
        line: token.line,
        column: token.column,
      };
      this.defines.push(node);
      this.parsedCount++;
      return [node];
    }

    const defMatch = raw.match(/^define\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(.*))?$/);
    if (defMatch) {
      const node: DefineDirective = {
        kind: "Define",
        name: defMatch[1],
        params: null,
        value: (defMatch[2] ?? "1").trim(),
        file: token.file,
        line: token.line,
        column: token.column,
      };
      this.defines.push(node);
      this.parsedCount++;
      return [node];
    }

    // #ifdef, #ifndef, #endif, #pragma, #if, #else — recognized preprocessor guards
    if (/^(ifdef|ifndef|endif|else|elif|if|undef|pragma)\b/.test(raw)) {
      this.parsedCount++;
      return [];
    }

    this.unsupportedCount++;
    const u: UnsupportedNode = {
      kind: "UnsupportedNode",
      construct: "preprocessor",
      rawSnippet: token.value,
      file: token.file,
      line: token.line,
      column: token.column,
    };
    return [u];
  }

  private parseUnsupportedTopLevel(): UnsupportedNode {
    const start = this.advance();
    const parts = [start.value];
    let depth = 0;
    while (!this.isAtEnd()) {
      const cur = this.advance();
      parts.push(cur.value);
      if (cur.value === "{") depth++;
      else if (cur.value === "}") {
        depth--;
        if (depth <= 0) {
          if (this.check(";")) this.advance();
          break;
        }
      } else if (cur.value === ";" && depth === 0) {
        break;
      }
      if (parts.length > 80) break;
    }
    this.unsupportedCount++;
    const snippet = parts.slice(0, 12).join(" ");
    this.addDiag(
      "warning",
      "unsupported",
      `Recognized C++ construct '${start.value}' is parsed structurally but not executed by the Arduino subset interpreter.`,
      start
    );
    return {
      kind: "UnsupportedNode",
      construct: start.value,
      rawSnippet: snippet,
      file: start.file,
      line: start.line,
      column: start.column,
    };
  }

  private parseEnum(): EnumDecl {
    const start = this.advance(); // 'enum'
    let isClass = false;
    if (this.match("class") || this.match("struct")) {
      isClass = true;
    }
    let name = "AnonymousEnum";
    if (this.peek().type === "IDENTIFIER") {
      name = this.advance().value;
      this.knownTypes.add(name);
    }
    // Optional underlying type `: uint8_t`
    if (this.match(":")) {
      this.parseTypeName();
    }
    this.expect("{", `Expected '{' in enum '${name}'`);
    const members: EnumMember[] = [];
    while (!this.isAtEnd() && !this.check("}")) {
      if (this.peek().type === "IDENTIFIER" || this.peek().type === "KEYWORD") {
        const memName = this.advance().value;
        let value: Expression | undefined;
        if (this.match("=")) {
          value = this.parseExpression();
        }
        members.push({ name: memName, value });
        if (!this.match(",")) break;
      } else {
        this.invalidCount++;
        this.addDiag("error", "syntax", `Expected enum member name, found '${this.peek().value}'`);
        this.advance();
      }
    }
    this.expect("}", `Expected '}' closing enum '${name}'`);
    this.match(";");
    this.parsedCount++;
    return {
      kind: "EnumDecl",
      name,
      isClass,
      members,
      file: start.file,
      line: start.line,
      column: start.column,
    };
  }

  private parseStructOrClass(): StructOrClassDecl {
    const start = this.advance();
    const structKind = start.value === "class" ? "class" : "struct";
    let name = "AnonymousStruct";
    if (this.peek().type === "IDENTIFIER") {
      name = this.advance().value;
      this.knownTypes.add(name);
    }
    // Optional inheritance `: public Base`
    if (this.match(":")) {
      while (!this.isAtEnd() && !this.check("{") && !this.check(";")) {
        this.advance();
      }
    }
    const fields: VarDecl[] = [];
    const methods: FunctionDecl[] = [];
    if (this.match("{")) {
      while (!this.isAtEnd() && !this.check("}")) {
        if (
          (this.check("public") || this.check("private") || this.check("protected")) &&
          this.peek(1).value === ":"
        ) {
          this.advance();
          this.advance();
          continue;
        }
        if (this.check(";")) {
          this.advance();
          continue;
        }
        // Constructor `ClassName(...)`
        if (this.peek().value === name && this.peek(1).value === "(") {
          const ctor = this.parseMethodOrCtor(name, name);
          if (ctor) methods.push(ctor);
          continue;
        }
        if (this.looksLikeTypeStart(this.pos)) {
          const parsed = this.parseDeclOrFunction();
          for (const d of parsed) {
            if (d.kind === "VarDecl") fields.push(d);
            else if (d.kind === "FunctionDecl") methods.push(d);
          }
          continue;
        }
        this.advance();
      }
      this.expect("}", `Expected '}' closing ${structKind} '${name}'`);
    }
    this.match(";");
    this.parsedCount++;
    return {
      kind: "StructOrClassDecl",
      structKind,
      name,
      fields,
      methods,
      file: start.file,
      line: start.line,
      column: start.column,
    };
  }

  private parseMethodOrCtor(returnType: string, name: string): FunctionDecl | null {
    const start = this.advance();
    const params = this.parseParamList();
    // Optional member initializer list `: a(1), b(2)`
    if (this.match(":")) {
      while (!this.isAtEnd() && !this.check("{") && !this.check(";")) {
        this.advance();
      }
    }
    let body: BlockStmt | null = null;
    if (this.check("{")) {
      body = this.parseBlock();
    } else {
      this.match(";");
    }
    this.parsedCount++;
    return {
      kind: "FunctionDecl",
      returnType,
      name,
      params,
      body,
      file: start.file,
      line: start.line,
      column: start.column,
    };
  }

  private isTypeToken(t: Token): boolean {
    if (t.type === "KEYWORD" && (TYPE_KEYWORDS.has(t.value) || QUALIFIER_KEYWORDS.has(t.value))) {
      return true;
    }
    if (t.type === "IDENTIFIER" && (this.knownTypes.has(t.value) || BUILTIN_CLASS_TYPES.has(t.value))) {
      return true;
    }
    return false;
  }

  private looksLikeTypeStart(startIdx: number): boolean {
    let idx = startIdx;
    let sawQualifierOrBuiltin = false;
    while (idx < this.tokens.length) {
      const t = this.tokens[idx];
      if (t.type === "KEYWORD" && QUALIFIER_KEYWORDS.has(t.value)) {
        sawQualifierOrBuiltin = true;
        idx++;
        continue;
      }
      break;
    }
    const base = this.tokens[idx];
    if (!base) return false;
    if (base.type === "KEYWORD" && TYPE_KEYWORDS.has(base.value)) {
      return true;
    }
    if (base.type === "IDENTIFIER" && (this.knownTypes.has(base.value) || BUILTIN_CLASS_TYPES.has(base.value))) {
      // Disambiguate `MyType x` vs `MyType(args)` expression
      const next = this.tokens[idx + 1];
      if (!next) return false;
      if (next.type === "IDENTIFIER" || next.value === "*" || next.value === "&" || QUALIFIER_KEYWORDS.has(next.value)) {
        return true;
      }
      return sawQualifierOrBuiltin;
    }
    // Heuristic for unknown external class declaration at top-level or statement: `SomeLibClass obj(a, b);` or `SomeLibClass obj;`
    if (
      base.type === "IDENTIFIER" &&
      /^[A-Z][A-Za-z0-9_]*$/.test(base.value)
    ) {
      const next = this.tokens[idx + 1];
      const next2 = this.tokens[idx + 2];
      if (
        next &&
        next.type === "IDENTIFIER" &&
        next2 &&
        (next2.value === ";" || next2.value === "=" || next2.value === "(" || next2.value === "[")
      ) {
        return true;
      }
    }
    return false;
  }

  private parseTypeName(): {
    typeName: string;
    isConst: boolean;
    isStatic: boolean;
    isProgmem: boolean;
  } {
    let isConst = false;
    let isStatic = false;
    let isProgmem = false;
    const parts: string[] = [];

    while (!this.isAtEnd()) {
      const t = this.peek();
      if (t.type === "KEYWORD" && QUALIFIER_KEYWORDS.has(t.value)) {
        if (t.value === "const" || t.value === "constexpr") isConst = true;
        if (t.value === "static") isStatic = true;
        if (t.value === "PROGMEM") isProgmem = true;
        this.advance();
        continue;
      }
      break;
    }

    // Handle multi-word numeric types like `unsigned long`, `unsigned char`, `long long`, `signed int`
    while (!this.isAtEnd()) {
      const t = this.peek();
      if (
        t.type === "KEYWORD" &&
        (t.value === "unsigned" || t.value === "signed" || t.value === "long" || t.value === "short")
      ) {
        parts.push(this.advance().value);
        continue;
      }
      if (
        parts.length === 0 ||
        (t.type === "KEYWORD" && (t.value === "int" || t.value === "char" || t.value === "double"))
      ) {
        if (this.isTypeToken(t) || t.type === "IDENTIFIER") {
          parts.push(this.advance().value);
        }
      }
      break;
    }

    // Consume post-type qualifiers (`const`, `PROGMEM`) and pointers/references (`*`, `&`)
    while (!this.isAtEnd()) {
      const t = this.peek();
      if (t.type === "KEYWORD" && QUALIFIER_KEYWORDS.has(t.value)) {
        if (t.value === "const") isConst = true;
        if (t.value === "PROGMEM") isProgmem = true;
        this.advance();
        continue;
      }
      if (t.value === "*" || t.value === "&") {
        parts.push(this.advance().value);
        continue;
      }
      break;
    }

    return {
      typeName: parts.join(" ") || "int",
      isConst,
      isStatic,
      isProgmem,
    };
  }

  private parseDeclOrFunction(): TopLevelDecl[] {
    const startToken = this.peek();
    const { typeName, isConst, isStatic, isProgmem } = this.parseTypeName();

    if (this.peek().type !== "IDENTIFIER") {
      this.invalidCount++;
      this.addDiag("error", "syntax", `Expected identifier after type '${typeName}', found '${this.peek().value}'`);
      this.synchronizeTopLevel();
      return [];
    }

    const nameToken = this.advance();
    let name = nameToken.value;

    // Handle ClassName::methodName
    if (this.match("::") && this.peek().type === "IDENTIFIER") {
      name = `${name}::${this.advance().value}`;
    }

    // Check if Function Declaration/Definition vs Constructor VarDecl:
    // If `name(` -> distinguish `void foo(int x) { ... }` or `void foo();` vs `Adafruit_SSD1306 display(128, 64, &Wire, -1);`
    if (this.check("(")) {
      if (this.isFunctionSignatureAhead()) {
        const params = this.parseParamList();
        // Optional `const` method qualifier
        if (this.check("const")) this.advance();
        let body: BlockStmt | null = null;
        if (this.check("{")) {
          body = this.parseBlock();
        } else {
          this.expect(";", `Expected ';' or '{' after function '${name}' signature`);
        }
        this.parsedCount++;
        return [
          {
            kind: "FunctionDecl",
            returnType: typeName,
            name,
            params,
            body,
            file: startToken.file,
            line: startToken.line,
            column: startToken.column,
          },
        ];
      } else {
        // Object constructor instantiation: e.g. `Adafruit_SSD1306 display(128, 64, &Wire, -1);`
        this.advance(); // '('
        const ctorArgs: Expression[] = [];
        if (!this.check(")")) {
          do {
            ctorArgs.push(this.parseExpression());
          } while (this.match(","));
        }
        this.expect(")", `Expected ')' after constructor arguments for '${name}'`);
        this.expect(";", `Expected ';' after declaration of '${name}'`);
        this.parsedCount++;
        return [
          {
            kind: "VarDecl",
            varType: typeName,
            name,
            isConst,
            isStatic,
            isProgmem,
            isArray: false,
            arrayDimensions: [],
            initializer: null,
            constructorArgs: ctorArgs,
            file: startToken.file,
            line: startToken.line,
            column: startToken.column,
          },
        ];
      }
    }

    // Otherwise variable declaration(s): `int a = 1, b = 2;` or `const uint8_t bmp[] PROGMEM = { ... };`
    const vars: VarDecl[] = [];
    let currentName = name;
    let first = true;

    while (true) {
      if (!first) {
        // Optional pointer `*`
        while (this.match("*") || this.match("&")) {
          // consumed
        }
        if (this.peek().type !== "IDENTIFIER") {
          this.invalidCount++;
          this.addDiag("error", "syntax", `Expected variable name after ',', found '${this.peek().value}'`);
          break;
        }
        currentName = this.advance().value;
      }
      first = false;

      let localProgmem = isProgmem;
      const arrayDimensions: (Expression | null)[] = [];
      let isArray = false;

      while (this.match("[")) {
        isArray = true;
        if (this.check("]")) {
          arrayDimensions.push(null);
        } else {
          arrayDimensions.push(this.parseExpression());
        }
        this.expect("]", `Expected ']' in array declaration for '${currentName}'`);
      }

      if (this.match("PROGMEM")) {
        localProgmem = true;
      }

      let initializer: Expression | null = null;
      if (this.match("=")) {
        initializer = this.parseInitializer();
      }

      this.parsedCount++;
      vars.push({
        kind: "VarDecl",
        varType: typeName,
        name: currentName,
        isConst,
        isStatic,
        isProgmem: localProgmem,
        isArray,
        arrayDimensions,
        initializer,
        constructorArgs: null,
        file: startToken.file,
        line: startToken.line,
        column: startToken.column,
      });

      if (!this.match(",")) break;
    }

    this.expect(";", `Expected ';' after variable declaration '${currentName}'`);
    return vars;
  }

  private isFunctionSignatureAhead(): boolean {
    // We are sitting on '('. Look inside parentheses up to matching ')'.
    let depth = 0;
    let idx = this.pos;
    let closeIdx = -1;
    while (idx < this.tokens.length) {
      const tok = this.tokens[idx];
      if (tok.value === "(") depth++;
      else if (tok.value === ")") {
        depth--;
        if (depth === 0) {
          closeIdx = idx;
          break;
        }
      }
      idx++;
    }
    if (closeIdx === -1) return true;
    const after = this.tokens[closeIdx + 1];
    if (after && (after.value === "{" || after.value === "const")) {
      return true;
    }
    // Check inside parens: if empty `()` and followed by `;`, could be function prototype like `void drawEyes();`
    const firstInside = this.tokens[this.pos + 1];
    if (firstInside && firstInside.value === ")") {
      return true;
    }
    // If first token inside parens is a type keyword or known type, it's a function prototype
    if (firstInside && (this.isTypeToken(firstInside) || firstInside.value === "void")) {
      return true;
    }
    return false;
  }

  private parseParamList(): ParamDecl[] {
    const params: ParamDecl[] = [];
    this.expect("(");
    if (!this.check(")")) {
      do {
        if (this.check("void") && this.peek(1).value === ")") {
          this.advance();
          break;
        }
        const { typeName } = this.parseTypeName();
        let paramName = "";
        if (this.peek().type === "IDENTIFIER") {
          paramName = this.advance().value;
        }
        let isArray = false;
        while (this.match("[")) {
          isArray = true;
          if (!this.check("]")) {
            this.parseExpression();
          }
          this.expect("]");
        }
        let defaultValue: Expression | null = null;
        if (this.match("=")) {
          defaultValue = this.parseExpression();
        }
        params.push({ paramType: typeName, name: paramName, isArray, defaultValue });
      } while (this.match(","));
    }
    this.expect(")");
    return params;
  }

  private parseBlock(): BlockStmt {
    const start = this.expect("{") ?? this.peek();
    const statements: Statement[] = [];
    while (!this.isAtEnd() && !this.check("}")) {
      const before = this.pos;
      const stmts = this.parseStatement();
      for (const s of stmts) statements.push(s);
      if (this.pos === before && !this.isAtEnd()) {
        const stuck = this.advance();
        this.invalidCount++;
        this.addDiag("error", "syntax", `Unexpected token '${stuck.value}' in block`, stuck);
        this.synchronizeStatement();
      }
    }
    this.expect("}", "Expected '}' to close block");
    return {
      kind: "BlockStmt",
      statements,
      file: start.file,
      line: start.line,
      column: start.column,
    };
  }

  private parseStatement(): Statement[] {
    const t = this.peek();

    if (t.type === "PREPROCESSOR") {
      this.advance();
      this.parsePreprocessor(t);
      return [];
    }

    if (t.value === "{") return [this.parseBlock()];
    if (t.value === ";") {
      this.advance();
      return [{ kind: "EmptyStmt", file: t.file, line: t.line, column: t.column }];
    }
    if (t.value === "if") return [this.parseIf()];
    if (t.value === "while") return [this.parseWhile()];
    if (t.value === "do") return [this.parseDoWhile()];
    if (t.value === "for") return [this.parseFor()];
    if (t.value === "switch") return [this.parseSwitch()];
    if (t.value === "return") return [this.parseReturn()];
    if (t.value === "break") {
      this.advance();
      this.expect(";");
      this.parsedCount++;
      return [{ kind: "BreakStmt", file: t.file, line: t.line, column: t.column }];
    }
    if (t.value === "continue") {
      this.advance();
      this.expect(";");
      this.parsedCount++;
      return [{ kind: "ContinueStmt", file: t.file, line: t.line, column: t.column }];
    }

    if (this.looksLikeTypeStart(this.pos)) {
      const decls = this.parseDeclOrFunction();
      return decls.filter(
        (d): d is VarDecl | UnsupportedNode =>
          d.kind === "VarDecl" || d.kind === "UnsupportedNode"
      );
    }

    const expr = this.parseExpression();
    this.expect(";", `Expected ';' after expression`);
    this.parsedCount++;
    return [
      {
        kind: "ExprStmt",
        expression: expr,
        file: t.file,
        line: t.line,
        column: t.column,
      },
    ];
  }

  private parseSingleStatement(): Statement {
    const list = this.parseStatement();
    if (list.length === 1) return list[0];
    const t = this.peek();
    return {
      kind: "BlockStmt",
      statements: list,
      file: t.file,
      line: t.line,
      column: t.column,
    };
  }

  private parseIf(): Statement {
    const start = this.advance();
    this.expect("(", "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.expect(")", "Expected ')' after if condition");
    const thenBranch = this.parseSingleStatement();
    let elseBranch: Statement | null = null;
    if (this.match("else")) {
      elseBranch = this.parseSingleStatement();
    }
    this.parsedCount++;
    return {
      kind: "IfStmt",
      condition,
      thenBranch,
      elseBranch,
      file: start.file,
      line: start.line,
      column: start.column,
    };
  }

  private parseWhile(): Statement {
    const start = this.advance();
    this.expect("(", "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.expect(")", "Expected ')' after while condition");
    const body = this.parseSingleStatement();
    this.parsedCount++;
    return {
      kind: "WhileStmt",
      condition,
      body,
      file: start.file,
      line: start.line,
      column: start.column,
    };
  }

  private parseDoWhile(): Statement {
    const start = this.advance();
    const body = this.parseSingleStatement();
    this.expect("while", "Expected 'while' after do body");
    this.expect("(", "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.expect(")", "Expected ')' after do-while condition");
    this.expect(";", "Expected ';' after do-while statement");
    this.parsedCount++;
    return {
      kind: "DoWhileStmt",
      body,
      condition,
      file: start.file,
      line: start.line,
      column: start.column,
    };
  }

  private parseFor(): Statement {
    const start = this.advance();
    this.expect("(", "Expected '(' after 'for'");
    let init: Statement | null = null;
    if (this.match(";")) {
      init = null;
    } else if (this.looksLikeTypeStart(this.pos)) {
      const decls = this.parseDeclOrFunction();
      if (decls.length === 1 && decls[0].kind === "VarDecl") {
        init = decls[0];
      } else {
        init = {
          kind: "BlockStmt",
          statements: decls.filter((d): d is VarDecl => d.kind === "VarDecl"),
          file: start.file,
          line: start.line,
          column: start.column,
        };
      }
    } else {
      const initExpr = this.parseExpression();
      this.expect(";");
      init = {
        kind: "ExprStmt",
        expression: initExpr,
        file: start.file,
        line: start.line,
        column: start.column,
      };
    }

    let condition: Expression | null = null;
    if (!this.check(";")) {
      condition = this.parseExpression();
    }
    this.expect(";", "Expected ';' after for-loop condition");

    let update: Expression | null = null;
    if (!this.check(")")) {
      update = this.parseExpression();
    }
    this.expect(")", "Expected ')' after for-loop clauses");
    const body = this.parseSingleStatement();
    this.parsedCount++;
    return {
      kind: "ForStmt",
      init,
      condition,
      update,
      body,
      file: start.file,
      line: start.line,
      column: start.column,
    };
  }

  private parseSwitch(): Statement {
    const start = this.advance();
    this.expect("(", "Expected '(' after 'switch'");
    const discriminant = this.parseExpression();
    this.expect(")", "Expected ')' after switch expression");
    this.expect("{", "Expected '{' after switch(...)");
    const cases: SwitchCase[] = [];
    while (!this.isAtEnd() && !this.check("}")) {
      if (this.match("case")) {
        const test = this.parseExpression();
        this.expect(":", "Expected ':' after case label");
        const consequent: Statement[] = [];
        while (!this.isAtEnd() && !this.check("case") && !this.check("default") && !this.check("}")) {
          const stmts = this.parseStatement();
          for (const s of stmts) consequent.push(s);
        }
        cases.push({ test, consequent });
      } else if (this.match("default")) {
        this.expect(":", "Expected ':' after default label");
        const consequent: Statement[] = [];
        while (!this.isAtEnd() && !this.check("case") && !this.check("default") && !this.check("}")) {
          const stmts = this.parseStatement();
          for (const s of stmts) consequent.push(s);
        }
        cases.push({ test: null, consequent });
      } else {
        this.invalidCount++;
        this.addDiag("error", "syntax", `Expected 'case' or 'default' in switch, found '${this.peek().value}'`);
        this.advance();
      }
    }
    this.expect("}", "Expected '}' closing switch statement");
    this.parsedCount++;
    return {
      kind: "SwitchStmt",
      discriminant,
      cases,
      file: start.file,
      line: start.line,
      column: start.column,
    };
  }

  private parseReturn(): Statement {
    const start = this.advance();
    let argument: Expression | null = null;
    if (!this.check(";")) {
      argument = this.parseExpression();
    }
    this.expect(";", "Expected ';' after return statement");
    this.parsedCount++;
    return {
      kind: "ReturnStmt",
      argument,
      file: start.file,
      line: start.line,
      column: start.column,
    };
  }

  private parseInitializer(): Expression {
    if (this.check("{")) {
      const start = this.advance();
      const elements: Expression[] = [];
      if (!this.check("}")) {
        do {
          if (this.check("}")) break; // allow trailing comma
          elements.push(this.parseInitializer());
        } while (this.match(","));
      }
      this.expect("}", "Expected '}' closing initializer list");
      return {
        kind: "ArrayInit",
        elements,
        file: start.file,
        line: start.line,
        column: start.column,
      };
    }
    return this.parseExpression();
  }

  private parseExpression(): Expression {
    return this.parseAssignment();
  }

  private parseAssignment(): Expression {
    const left = this.parseTernary();
    const t = this.peek();
    if (
      t.type === "OPERATOR" &&
      ["=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>="].includes(t.value)
    ) {
      this.advance();
      const right = this.parseAssignment();
      return {
        kind: "AssignExpr",
        operator: t.value,
        left,
        right,
        file: t.file,
        line: t.line,
        column: t.column,
      };
    }
    return left;
  }

  private parseTernary(): Expression {
    let expr = this.parseLogicalOr();
    if (this.match("?")) {
      const qTok = this.peek(-1);
      const consequent = this.parseExpression();
      this.expect(":", "Expected ':' in ternary expression");
      const alternate = this.parseTernary();
      expr = {
        kind: "TernaryExpr",
        condition: expr,
        consequent,
        alternate,
        file: qTok.file,
        line: qTok.line,
        column: qTok.column,
      };
    }
    return expr;
  }

  private parseBinary(next: () => Expression, operators: string[]): Expression {
    let left = next();
    while (this.peek().type === "OPERATOR" && operators.includes(this.peek().value)) {
      const op = this.advance();
      const right = next();
      left = {
        kind: "BinaryExpr",
        operator: op.value,
        left,
        right,
        file: op.file,
        line: op.line,
        column: op.column,
      };
    }
    return left;
  }

  private parseLogicalOr(): Expression {
    return this.parseBinary(() => this.parseLogicalAnd(), ["||"]);
  }

  private parseLogicalAnd(): Expression {
    return this.parseBinary(() => this.parseBitwiseOr(), ["&&"]);
  }

  private parseBitwiseOr(): Expression {
    return this.parseBinary(() => this.parseBitwiseXor(), ["|"]);
  }

  private parseBitwiseXor(): Expression {
    return this.parseBinary(() => this.parseBitwiseAnd(), ["^"]);
  }

  private parseBitwiseAnd(): Expression {
    return this.parseBinary(() => this.parseEquality(), ["&"]);
  }

  private parseEquality(): Expression {
    return this.parseBinary(() => this.parseRelational(), ["==", "!="]);
  }

  private parseRelational(): Expression {
    return this.parseBinary(() => this.parseShift(), ["<", "<=", ">", ">="]);
  }

  private parseShift(): Expression {
    return this.parseBinary(() => this.parseAdditive(), ["<<", ">>"]);
  }

  private parseAdditive(): Expression {
    return this.parseBinary(() => this.parseMultiplicative(), ["+", "-"]);
  }

  private parseMultiplicative(): Expression {
    return this.parseBinary(() => this.parseUnary(), ["*", "/", "%"]);
  }

  private parseUnary(): Expression {
    const t = this.peek();

    if (t.value === "sizeof") {
      this.advance();
      let target = "";
      if (this.match("(")) {
        const parts: string[] = [];
        let depth = 1;
        while (!this.isAtEnd() && depth > 0) {
          const cur = this.advance();
          if (cur.value === "(") depth++;
          else if (cur.value === ")") {
            depth--;
            if (depth === 0) break;
          }
          parts.push(cur.value);
        }
        target = parts.join(" ");
      } else {
        target = this.advance().value;
      }
      return { kind: "SizeofExpr", target, file: t.file, line: t.line, column: t.column };
    }

    // C-style cast: `(int)x`, `(float)val`, `(uint8_t)a`
    if (t.value === "(" && this.looksLikeCastAhead()) {
      this.advance(); // '('
      const { typeName } = this.parseTypeName();
      this.expect(")");
      const operand = this.parseUnary();
      return {
        kind: "CastExpr",
        targetType: typeName,
        operand,
        file: t.file,
        line: t.line,
        column: t.column,
      };
    }

    if (
      t.type === "OPERATOR" &&
      ["!", "~", "-", "+", "++", "--", "&", "*"].includes(t.value)
    ) {
      this.advance();
      const operand = this.parseUnary();
      return {
        kind: "UnaryExpr",
        operator: t.value,
        operand,
        prefix: true,
        file: t.file,
        line: t.line,
        column: t.column,
      };
    }

    return this.parsePostfix();
  }

  private looksLikeCastAhead(): boolean {
    const t1 = this.peek(1);
    if (!t1) return false;
    if (t1.type === "KEYWORD" && (TYPE_KEYWORDS.has(t1.value) || QUALIFIER_KEYWORDS.has(t1.value))) {
      // Find closing ')' and check it's NOT followed by ';' or ')' alone
      let idx = this.pos + 1;
      while (idx < this.tokens.length && this.tokens[idx].value !== ")") {
        if (this.tokens[idx].value === "(" || this.tokens[idx].value === ";") return false;
        idx++;
      }
      const after = this.tokens[idx + 1];
      if (!after) return false;
      return after.value !== ";" && after.value !== ")" && after.value !== "," && after.value !== "}";
    }
    return false;
  }

  private parsePostfix(): Expression {
    let expr = this.parsePrimary();
    while (!this.isAtEnd()) {
      const t = this.peek();
      if (t.value === "(") {
        this.advance();
        const args: Expression[] = [];
        if (!this.check(")")) {
          do {
            args.push(this.parseExpression());
          } while (this.match(","));
        }
        this.expect(")", "Expected ')' after function arguments");
        expr = {
          kind: "CallExpr",
          callee: expr,
          args,
          file: t.file,
          line: t.line,
          column: t.column,
        };
      } else if (t.value === "." || t.value === "->") {
        const op = this.advance();
        const prop = this.advance();
        expr = {
          kind: "MemberExpr",
          object: expr,
          property: prop.value,
          isArrow: op.value === "->",
          file: op.file,
          line: op.line,
          column: op.column,
        };
      } else if (t.value === "[") {
        const bracket = this.advance();
        const index = this.parseExpression();
        this.expect("]", "Expected ']' after array index");
        expr = {
          kind: "IndexExpr",
          object: expr,
          index,
          file: bracket.file,
          line: bracket.line,
          column: bracket.column,
        };
      } else if (t.value === "++" || t.value === "--") {
        const op = this.advance();
        expr = {
          kind: "UnaryExpr",
          operator: op.value,
          operand: expr,
          prefix: false,
          file: op.file,
          line: op.line,
          column: op.column,
        };
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): Expression {
    const t = this.peek();

    if (t.type === "NUMBER") {
      this.advance();
      return {
        kind: "NumberLiteral",
        value: parseNumberValue(t.value),
        raw: t.value,
        file: t.file,
        line: t.line,
        column: t.column,
      };
    }

    if (t.type === "STRING") {
      this.advance();
      let combined = t.value;
      // C++ adjacent string literal concatenation
      while (this.peek().type === "STRING") {
        combined += this.advance().value;
      }
      return {
        kind: "StringLiteral",
        value: combined,
        file: t.file,
        line: t.line,
        column: t.column,
      };
    }

    if (t.type === "CHAR") {
      this.advance();
      return {
        kind: "CharLiteral",
        value: t.value,
        charCode: t.value.length > 0 ? t.value.charCodeAt(0) : 0,
        file: t.file,
        line: t.line,
        column: t.column,
      };
    }

    if (t.value === "true" || t.value === "false") {
      this.advance();
      return {
        kind: "BoolLiteral",
        value: t.value === "true",
        file: t.file,
        line: t.line,
        column: t.column,
      };
    }

    if (t.value === "nullptr" || t.value === "NULL") {
      this.advance();
      return {
        kind: "NumberLiteral",
        value: 0,
        raw: t.value,
        file: t.file,
        line: t.line,
        column: t.column,
      };
    }

    if (t.value === "(") {
      this.advance();
      const expr = this.parseExpression();
      this.expect(")", "Expected ')' after parenthesized expression");
      return expr;
    }

    // Functional-style type cast like `String(123)` or `int(x)` or `float(a)`
    if (t.type === "KEYWORD" && TYPE_KEYWORDS.has(t.value)) {
      this.advance();
      return {
        kind: "Identifier",
        name: t.value,
        file: t.file,
        line: t.line,
        column: t.column,
      };
    }

    if (t.type === "IDENTIFIER" || t.value === "this") {
      this.advance();
      let name = t.value;
      // Scoped enum / static member `State::PET`
      if (this.match("::") && this.peek().type === "IDENTIFIER") {
        name = `${name}::${this.advance().value}`;
      }
      return {
        kind: "Identifier",
        name,
        file: t.file,
        line: t.line,
        column: t.column,
      };
    }

    if (t.value === "{") {
      return this.parseInitializer();
    }

    this.invalidCount++;
    this.addDiag("error", "syntax", `Unexpected token '${t.value || "EOF"}' in expression`, t);
    if (!this.isAtEnd()) this.advance();
    return {
      kind: "NumberLiteral",
      value: 0,
      raw: "0",
      file: t.file,
      line: t.line,
      column: t.column,
    };
  }
}

export function parseFirmwareProject(files: FirmwareFileData[]): ParsedProgram {
  const declarations: TopLevelDecl[] = [];
  const includes: IncludeDirective[] = [];
  const defines: DefineDirective[] = [];
  const diagnostics: DiagnosticMessage[] = [];
  const missingSourceFiles: string[] = [];
  const knownTypes = new Set<string>(BUILTIN_CLASS_TYPES);

  let totalLines = 0;
  let successfullyParsedNodes = 0;
  let recognizedUnsupportedNodes = 0;
  let invalidSyntaxNodes = 0;

  // Sort headers (.h, .hpp) first so user-defined structs/enums are registered before .ino/.cpp
  const ordered = [...files].sort((a, b) => {
    const score = (f: FirmwareFileData) => {
      const ext = f.extension.toLowerCase();
      if (ext === ".h" || ext === ".hpp") return 0;
      if (ext === ".ino") return 1;
      if (ext === ".cpp") return 2;
      return 3;
    };
    return score(a) - score(b);
  });

  const fileIndex = new Map<string, FirmwareFileData>();
  for (const f of ordered) {
    fileIndex.set(f.path.toLowerCase(), f);
    fileIndex.set(f.name.toLowerCase(), f);
  }

  for (const file of ordered) {
    const ext = file.extension.toLowerCase();
    // Skip non-code notes unless it's .txt containing C++ code
    const lexRes = tokenizeSource(file.content, file.path);
    totalLines += lexRes.lineCount;
    for (const d of lexRes.diagnostics) {
      diagnostics.push(d);
      invalidSyntaxNodes++;
    }

    if (ext === ".txt" && !/\b(void|int|setup|loop|#include|#define)\b/.test(file.content)) {
      continue;
    }

    const parser = new SingleFileParser(lexRes.tokens, file.path, knownTypes);
    parser.parse();

    for (const decl of parser.declarations) declarations.push(decl);
    for (const inc of parser.includes) {
      includes.push(inc);
      if (inc.isLocal) {
        const key = inc.header.toLowerCase();
        const baseName = key.split("/").pop() ?? key;
        if (!fileIndex.has(key) && !fileIndex.has(baseName)) {
          if (!missingSourceFiles.includes(inc.header)) {
            missingSourceFiles.push(inc.header);
          }
          diagnostics.push({
            id: `missing_${file.path}_${inc.line}_${inc.header}`,
            severity: "error",
            category: "missing_dependency",
            file: file.path,
            line: inc.line,
            column: inc.column,
            message: `Local header file "${inc.header}" was not found in the imported project files.`,
            suggestion: `Use IMPORT CODE -> Add Files to upload "${inc.header}" into this firmware project.`,
          });
        }
      }
    }
    for (const def of parser.defines) defines.push(def);
    for (const diag of parser.diagnostics) diagnostics.push(diag);

    successfullyParsedNodes += parser.parsedCount;
    recognizedUnsupportedNodes += parser.unsupportedCount;
    invalidSyntaxNodes += parser.invalidCount;
  }

  return {
    declarations,
    includes,
    defines,
    missingSourceFiles,
    totalLines,
    successfullyParsedNodes,
    recognizedUnsupportedNodes,
    invalidSyntaxNodes,
    diagnostics,
  };
}
