export interface SourceLoc {
  file: string;
  line: number;
  column: number;
}

export interface IncludeDirective extends SourceLoc {
  kind: "Include";
  header: string;
  isLocal: boolean;
}

export interface DefineDirective extends SourceLoc {
  kind: "Define";
  name: string;
  params: string[] | null;
  value: string;
}

export interface EnumMember {
  name: string;
  value?: Expression;
}

export interface EnumDecl extends SourceLoc {
  kind: "EnumDecl";
  name: string;
  isClass: boolean;
  members: EnumMember[];
}

export interface VarDecl extends SourceLoc {
  kind: "VarDecl";
  varType: string;
  name: string;
  isConst: boolean;
  isStatic: boolean;
  isProgmem: boolean;
  isArray: boolean;
  arrayDimensions: (Expression | null)[];
  initializer: Expression | null;
  constructorArgs: Expression[] | null;
}

export interface ParamDecl {
  paramType: string;
  name: string;
  isArray?: boolean;
  defaultValue?: Expression | null;
}

export interface FunctionDecl extends SourceLoc {
  kind: "FunctionDecl";
  returnType: string;
  name: string;
  params: ParamDecl[];
  body: BlockStmt | null;
}

export interface StructOrClassDecl extends SourceLoc {
  kind: "StructOrClassDecl";
  structKind: "struct" | "class";
  name: string;
  fields: VarDecl[];
  methods: FunctionDecl[];
}

export interface UnsupportedNode extends SourceLoc {
  kind: "UnsupportedNode";
  construct: string;
  rawSnippet: string;
}

export type TopLevelDecl =
  | IncludeDirective
  | DefineDirective
  | EnumDecl
  | VarDecl
  | FunctionDecl
  | StructOrClassDecl
  | UnsupportedNode;

export interface BlockStmt extends SourceLoc {
  kind: "BlockStmt";
  statements: Statement[];
}

export interface ExprStmt extends SourceLoc {
  kind: "ExprStmt";
  expression: Expression;
}

export interface EmptyStmt extends SourceLoc {
  kind: "EmptyStmt";
}

export interface IfStmt extends SourceLoc {
  kind: "IfStmt";
  condition: Expression;
  thenBranch: Statement;
  elseBranch: Statement | null;
}

export interface WhileStmt extends SourceLoc {
  kind: "WhileStmt";
  condition: Expression;
  body: Statement;
}

export interface DoWhileStmt extends SourceLoc {
  kind: "DoWhileStmt";
  body: Statement;
  condition: Expression;
}

export interface ForStmt extends SourceLoc {
  kind: "ForStmt";
  init: Statement | null;
  condition: Expression | null;
  update: Expression | null;
  body: Statement;
}

export interface SwitchCase {
  test: Expression | null; // null = default
  consequent: Statement[];
}

export interface SwitchStmt extends SourceLoc {
  kind: "SwitchStmt";
  discriminant: Expression;
  cases: SwitchCase[];
}

export interface ReturnStmt extends SourceLoc {
  kind: "ReturnStmt";
  argument: Expression | null;
}

export interface BreakStmt extends SourceLoc {
  kind: "BreakStmt";
}

export interface ContinueStmt extends SourceLoc {
  kind: "ContinueStmt";
}

export type Statement =
  | BlockStmt
  | VarDecl
  | ExprStmt
  | EmptyStmt
  | IfStmt
  | WhileStmt
  | DoWhileStmt
  | ForStmt
  | SwitchStmt
  | ReturnStmt
  | BreakStmt
  | ContinueStmt
  | UnsupportedNode;

export interface NumberLiteral extends SourceLoc {
  kind: "NumberLiteral";
  value: number;
  raw: string;
}

export interface StringLiteral extends SourceLoc {
  kind: "StringLiteral";
  value: string;
}

export interface CharLiteral extends SourceLoc {
  kind: "CharLiteral";
  value: string;
  charCode: number;
}

export interface BoolLiteral extends SourceLoc {
  kind: "BoolLiteral";
  value: boolean;
}

export interface IdentifierExpr extends SourceLoc {
  kind: "Identifier";
  name: string;
}

export interface ArrayInitExpr extends SourceLoc {
  kind: "ArrayInit";
  elements: Expression[];
}

export interface UnaryExpr extends SourceLoc {
  kind: "UnaryExpr";
  operator: string;
  operand: Expression;
  prefix: boolean;
}

export interface CastExpr extends SourceLoc {
  kind: "CastExpr";
  targetType: string;
  operand: Expression;
}

export interface BinaryExpr extends SourceLoc {
  kind: "BinaryExpr";
  operator: string;
  left: Expression;
  right: Expression;
}

export interface AssignExpr extends SourceLoc {
  kind: "AssignExpr";
  operator: string;
  left: Expression;
  right: Expression;
}

export interface TernaryExpr extends SourceLoc {
  kind: "TernaryExpr";
  condition: Expression;
  consequent: Expression;
  alternate: Expression;
}

export interface CallExpr extends SourceLoc {
  kind: "CallExpr";
  callee: Expression;
  args: Expression[];
}

export interface MemberExpr extends SourceLoc {
  kind: "MemberExpr";
  object: Expression;
  property: string;
  isArrow: boolean;
}

export interface IndexExpr extends SourceLoc {
  kind: "IndexExpr";
  object: Expression;
  index: Expression;
}

export interface SizeofExpr extends SourceLoc {
  kind: "SizeofExpr";
  target: string;
}

export type Expression =
  | NumberLiteral
  | StringLiteral
  | CharLiteral
  | BoolLiteral
  | IdentifierExpr
  | ArrayInitExpr
  | UnaryExpr
  | CastExpr
  | BinaryExpr
  | AssignExpr
  | TernaryExpr
  | CallExpr
  | MemberExpr
  | IndexExpr
  | SizeofExpr;

export interface ParsedProgram {
  declarations: TopLevelDecl[];
  includes: IncludeDirective[];
  defines: DefineDirective[];
  missingSourceFiles: string[];
  totalLines: number;
  successfullyParsedNodes: number;
  recognizedUnsupportedNodes: number;
  invalidSyntaxNodes: number;
  diagnostics: import("../types").DiagnosticMessage[];
}
