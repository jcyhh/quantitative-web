import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const sourceRoot = path.resolve('src')
const permittedRoots = [
  path.resolve('src/shared/lib/decimal'),
  path.resolve('src/shared/lib/number'),
]
const prohibitedBinaryOperators = new Map([
  [ts.SyntaxKind.PlusToken, '+'],
  [ts.SyntaxKind.MinusToken, '-'],
  [ts.SyntaxKind.AsteriskToken, '*'],
  [ts.SyntaxKind.SlashToken, '/'],
  [ts.SyntaxKind.PlusEqualsToken, '+='],
  [ts.SyntaxKind.MinusEqualsToken, '-='],
  [ts.SyntaxKind.AsteriskEqualsToken, '*='],
  [ts.SyntaxKind.SlashEqualsToken, '/='],
])
const prohibitedUnaryOperators = new Map([
  [ts.SyntaxKind.PlusPlusToken, '++'],
  [ts.SyntaxKind.MinusMinusToken, '--'],
])
const sourceFiles = collectSourceFiles(sourceRoot)
const violations = sourceFiles.flatMap(checkFile)

if (violations.length > 0) {
  console.error('Raw arithmetic operators are only allowed inside shared/lib/decimal and shared/lib/number.')
  for (const violation of violations) console.error(`${violation.file}:${violation.line}:${violation.column} ${violation.operator} → use shared/lib/decimal for financial values, shared/lib/number for non-financial values, or a template literal for text concatenation.`)
  process.exitCode = 1
}

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(entryPath)
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : []
  })
}

function checkFile(filePath) {
  if (permittedRoots.some((root) => filePath.startsWith(`${root}${path.sep}`))) return []

  const source = ts.createSourceFile(filePath, fs.readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true, getScriptKind(filePath))
  const violations = []
  const createViolation = (node, operator) => {
    const position = source.getLineAndCharacterOfPosition(node.getStart(source))
    return { file: path.relative(process.cwd(), filePath), line: position.line + 1, column: position.character + 1, operator }
  }
  const visit = (node) => {
    if (ts.isBinaryExpression(node)) {
      const operator = prohibitedBinaryOperators.get(node.operatorToken.kind)
      if (operator) violations.push(createViolation(node, operator))
    }

    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      const operator = prohibitedUnaryOperators.get(node.operator)
      if (operator) violations.push(createViolation(node, operator))
    }

    ts.forEachChild(node, visit)
  }

  visit(source)
  return violations
}

function getScriptKind(filePath) {
  return filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
}
