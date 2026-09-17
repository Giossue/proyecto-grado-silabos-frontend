import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = resolve(
  projectRoot,
  process.env.OPENAPI_FILE
    ?? "../proyecto-grado-silabos-backend/docs/architecture/openapi.json",
);

if (!existsSync(contractPath)) {
  throw new Error(
    `No se encontró OpenAPI en ${contractPath}. Defina OPENAPI_FILE con la ruta al contrato del backend.`,
  );
}

const document = JSON.parse(readFileSync(contractPath, "utf8"));
const operations = Object.entries(document.paths ?? {}).flatMap(([path, methods]) =>
  Object.keys(methods).map((method) => ({ method: method.toUpperCase(), path })),
);

const apiDirectory = join(projectRoot, "src/api");
const sourceFiles = readdirSync(apiDirectory)
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts") && name !== "client.ts")
  .map((name) => join(apiDirectory, name));

const templatePath = (expression) => {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (!ts.isTemplateExpression(expression)) return null;

  let path = expression.head.text;
  for (const span of expression.templateSpans) {
    const expressionName = span.expression.getText();
    const isQuery = path.includes("?") || /(?:query|suffix)/i.test(expressionName);
    path += `${isQuery ? "" : "{dynamic}"}${span.literal.text}`;
  }
  return path;
};

const methodFrom = (argument, call, source) => {
  const leadingSource = source.text.slice(Math.max(0, call.getFullStart() - 240), call.getStart());
  const documentedOverride = leadingSource.match(/@openapi-method\s+(GET|POST|PUT|PATCH|DELETE)/i);
  if (documentedOverride) return documentedOverride[1].toUpperCase();
  if (!argument || !ts.isObjectLiteralExpression(argument)) return "GET";
  const property = argument.properties.find(
    (candidate) => ts.isPropertyAssignment(candidate)
      && candidate.name.getText().replaceAll(/["']/g, "") === "method",
  );
  if (!property || !ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.initializer)) {
    return "GET";
  }
  return property.initializer.text.toUpperCase();
};

const consumers = [];
for (const filename of sourceFiles) {
  const source = ts.createSourceFile(
    filename,
    readFileSync(filename, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const visit = (node) => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && ["api", "apiBlob"].includes(node.expression.text)
    ) {
      const rawPath = node.arguments[0] ? templatePath(node.arguments[0]) : null;
      if (!rawPath) {
        consumers.push({ filename, line: source.getLineAndCharacterOfPosition(node.pos).line + 1, error: "ruta no estática" });
      } else {
        consumers.push({
          filename,
          line: source.getLineAndCharacterOfPosition(node.pos).line + 1,
          method: node.expression.text === "apiBlob" ? "GET" : methodFrom(node.arguments[1], node, source),
          path: `/api/v1${rawPath.split("?")[0]}`,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

const samePathShape = (consumerPath, contractPathValue) => {
  const consumerSegments = consumerPath.split("/");
  const contractSegments = contractPathValue.split("/");
  return consumerSegments.length === contractSegments.length
    && consumerSegments.every((segment, index) => {
      const contractSegment = contractSegments[index];
      return segment === "{dynamic}" || /^\{[^}]+\}$/.test(segment)
        ? /^\{[^}]+\}$/.test(contractSegment)
        : segment === contractSegment;
    });
};

const failures = consumers.filter((consumer) =>
  consumer.error
  || !operations.some((operation) =>
    operation.method === consumer.method && samePathShape(consumer.path, operation.path),
  ),
);

if (failures.length) {
  for (const failure of failures) {
    const location = `${failure.filename.replace(`${projectRoot}/`, "")}:${failure.line}`;
    console.error(`${location}: ${failure.error ?? `${failure.method} ${failure.path} no existe en OpenAPI`}`);
  }
  process.exitCode = 1;
} else {
  console.log(`${consumers.length} consumidores de la SPA coinciden con ${operations.length} operaciones OpenAPI.`);
}
