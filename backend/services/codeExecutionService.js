const axios = require('axios');

const EXECUTOR_URL = (process.env.CODE_EXECUTOR_URL || 'http://127.0.0.1:2000').replace(/\/$/, '');
const LANGUAGE_RUNTIMES = {
  python: ['python', '*'], javascript: ['javascript', '*'], typescript: ['typescript', '*'],
  java: ['java', '*'], 'c++': ['c++', '*'], go: ['go', '*'], sqlite3: ['sqlite3', '*'],
};

function pythonLiteral(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (value === null) return 'None';
  if (Array.isArray(value)) return `[${value.map(pythonLiteral).join(', ')}]`;
  if (typeof value === 'object') return `{${Object.entries(value).map(([k, v]) => `${pythonLiteral(k)}: ${pythonLiteral(v)}`).join(', ')}}`;
  return String(value);
}

function jsonArgs(testCase, problem) {
  if (Array.isArray(testCase.args)) return testCase.args;
  const input = String(testCase.input ?? '').trim();
  if (problem.title.toLowerCase().includes('longest substring')) {
    try { return [JSON.parse(input)]; } catch { return [input.replace(/^['"]|['"]$/g, '')]; }
  }
  if (problem.title.toLowerCase().includes('two sum')) {
    const match = input.match(/nums\s*=\s*(\[[\s\S]*?\])\s*,\s*target\s*=\s*(-?\d+)/i);
    if (match) return [JSON.parse(match[1]), Number(match[2])];
  }
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new Error(`Test case input must be JSON arguments (for example ["abc"]) for ${problem.title}.`);
  }
}

function literal(value, language) {
  if (language === 'python') return pythonLiteral(value);
  if (language === 'javascript' || language === 'typescript') return JSON.stringify(value);
  if (language === 'java') {
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `new int[] { ${value.map(x => Number(x)).join(', ')} }`;
    return String(value);
  }
  if (language === 'go') {
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `[]int{${value.map(x => Number(x)).join(',')}}`;
    return String(value);
  }
  if (language === 'c++') {
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `std::vector<int>{${value.map(x => Number(x)).join(',')}}`;
    return String(value);
  }
  return JSON.stringify(value);
}

function makeHarness(code, language, cases, problem) {
  if (language === 'sqlite3') {
    return { source: '', cases: cases.map(tc => ({
      stdin: `${tc.setupSql || ''}\n.mode json\n${code}\n`,
      expected: String(tc.expected),
    })) };
  }
  const method = problem.functionName || (problem.title.toLowerCase().includes('longest substring')
    ? 'lengthOfLongestSubstring' : problem.title.toLowerCase().includes('two sum') ? 'twoSum' : null);
  if (!method) {
    // Generated questions use a complete stdin/stdout program; each case is
    // passed as standard input and the program's output is compared directly.
    return { source: code, cases: cases.map(tc => ({ stdin: String(tc.stdin ?? tc.input ?? ''), expected: String(tc.expected) })) };
  }
  const className = problem.className || 'Solution';
  if (!/^[A-Za-z_$][\w$]*$/.test(method) || !/^[A-Za-z_$][\w$]*$/.test(className)) {
    throw new Error('The problem has an invalid function or class entrypoint. Generate the question again.');
  }

  const argsByCase = cases.map(tc => jsonArgs(tc, problem));
  if (language === 'python') {
    const calls = argsByCase.map(args => `print(json.dumps(${className}().${method}(${args.map(x => literal(x, language)).join(', ')})))`).join('\n')
    return { source: `import json\n${code}\n\nif __name__ == "__main__":\n${calls.split('\n').map(line => `    ${line}`).join('\n')}\n`, cases: [{ stdin: '', expected: cases.map(tc => String(tc.expected)).join('\n') }] };
  }
  if (language === 'javascript' || language === 'typescript') {
    const calls = argsByCase.map(args => `console.log(JSON.stringify(new ${className}().${method}(${args.map(x => literal(x, language)).join(', ')})));`).join('\n');
    return { source: `${code}\n\n${calls}\n`, cases: [{ stdin: '', expected: cases.map(tc => String(tc.expected)).join('\n') }] };
  }
  if (language === 'c++') {
    const calls = argsByCase.map(args => {
      const locals = args.map((value, index) => `auto arg${index} = ${literal(value, language)};`).join(' ');
      return `{ ${locals} printResult(${className}().${method}(${args.map((_, index) => `arg${index}`).join(', ')})); }`;
    }).join('\n');
    const harness = `\n#include <iostream>\n#include <vector>\n#include <string>\n#include <iomanip>\nusing namespace std;\ntemplate<class T> void printResultInline(const T& v){cout<<v;}\nvoid printResultInline(const string& v){cout<<quoted(v);}\ntemplate<> void printResultInline<bool>(const bool& v){cout<<(v?"true":"false");}\ntemplate<class T> void printResult(const T& v){ cout << v << "\\n"; }\nvoid printResult(const string& v){cout<<quoted(v)<<"\\n";}\ntemplate<class T> void printResult(const vector<T>& v){ cout << "["; for(size_t i=0;i<v.size();++i){if(i)cout<<", "; printResultInline(v[i]);} cout<<"]\\n";}\nint main(){\n${calls}\n}\n`;
    return { source: `${code}\n${harness}`, cases: [{ stdin: '', expected: cases.map(tc => String(tc.expected)).join('\n') }] };
  }
  if (language === 'java') {
    const calls = argsByCase.map(args => `printResult(new Main().${method}(${args.map(x => literal(x, language)).join(', ')}));`).join('\n');
    const source = code.replace(new RegExp(`\\bclass\\s+${className}\\b`), 'public class Main').replace(/\}\s*$/, `\nprivate static void printResult(Object value) { if (value instanceof int[]) System.out.println(java.util.Arrays.toString((int[]) value).replace(" ", "")); else if (value instanceof long[]) System.out.println(java.util.Arrays.toString((long[]) value).replace(" ", "")); else if (value instanceof boolean[]) System.out.println(java.util.Arrays.toString((boolean[]) value).replace(" ", "")); else if (value instanceof String) System.out.println("\\\"" + ((String)value).replace("\\\\", "\\\\\\\\").replace("\\\"", "\\\\\\\"") + "\\\""); else System.out.println(value); }\npublic static void main(String[] args) {\n${calls}\n}\n}`);
    return { source, filename: 'Main.java', cases: [{ stdin: '', expected: cases.map(tc => String(tc.expected)).join('\n') }] };
  }
  if (language === 'go') {
    const cleanCode = code.replace(/^package\s+main\s*/m, '').replace(/^import\s+"[^"]+"\s*/gm, '');
    const calls = argsByCase.map(args => `printResult(${method}(${args.map(x => literal(x, language)).join(', ')}))`).join('\n');
    return { source: `package main\nimport ("fmt"; "encoding/json")\n${cleanCode}\nfunc printResult(v interface{}) { b, _ := json.Marshal(v); fmt.Println(string(b)) }\nfunc main(){\n${calls}\n}\n`, cases: [{ stdin: '', expected: cases.map(tc => String(tc.expected)).join('\n') }] };
  }
  throw new Error(`Running test cases for ${problem.language} is not configured.`);
}

async function runOnce(language, source, filename, stdin) {
  const runtime = LANGUAGE_RUNTIMES[language];
  if (!runtime) throw new Error(`The ${language} runtime is not supported by the configured code runner.`);
  let response;
  try {
    response = await axios.post(`${EXECUTOR_URL}/api/v2/execute`, {
      language: runtime[0], version: runtime[1],
      files: [{ name: filename || ({ python: 'main.py', javascript: 'main.js', typescript: 'main.ts', java: 'Solution.java', 'c++': 'main.cpp', go: 'main.go' })[language], content: source }],
      // Piston defaults cap run wall time and CPU time at 3 seconds.
      stdin, args: [], compile_timeout: 10000, run_timeout: 3000,
      compile_cpu_time: 10000, run_cpu_time: 3000,
      compile_memory_limit: 268435456, run_memory_limit: 134217728,
    }, { timeout: 20000 });
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error(`Code runner is unavailable at ${EXECUTOR_URL}. Start the self-hosted Docker runner and install its language runtimes.`);
    }
    throw new Error(error.response?.data?.message || error.message || 'Code runner request failed.');
  }
  const result = response.data;
  if (result.compile && (result.compile.code !== 0 || result.compile.status)) {
    return { error: result.compile.stderr || result.compile.message || 'Compilation failed.' };
  }
  if (result.run?.code !== 0 || result.run?.status) {
    return { error: result.run?.stderr || result.run?.message || `Program exited with code ${result.run?.code}.` };
  }
  return { stdout: result.run?.stdout || '', timeMs: result.run?.wall_time };
}

exports.runTestCases = async ({ code, language, problem, testCases }) => {
  const normalizedLanguage = problem.mode === 'sql' ? 'sqlite3' : String(language).toLowerCase().replace(/\s*\d.*$/, '').trim();
  const { source, filename, cases } = makeHarness(code, normalizedLanguage, testCases, problem);
  const batch = cases.length === 1 && testCases.length > 1 && cases[0].stdin === '';
  if (normalizedLanguage === 'sqlite3') {
    const outcomes = [];
    for (let i = 0; i < testCases.length; i += 1) {
      const result = await runOnce(normalizedLanguage, '', 'main.sql', cases[i].stdin);
      outcomes.push(compareCase(testCases[i], result.error ? `Error: ${result.error}` : result.stdout.trim(), result.timeMs));
    }
    return outcomes;
  }
  if (batch) {
    const result = await runOnce(normalizedLanguage, source, filename, '');
    if (result.error) return testCases.map(tc => ({ id: tc.id, input: tc.input, expected: tc.expected, actual: result.error, status: 'failed' }));
    const actualLines = result.stdout.trimEnd().split(/\r?\n/);
    return testCases.map((tc, index) => compareCase(tc, actualLines[index] ?? '', result.timeMs));
  }
  const outcomes = [];
  for (let index = 0; index < testCases.length; index += 1) {
    const result = await runOnce(normalizedLanguage, source, filename, cases[index].stdin);
    outcomes.push(result.error
      ? { id: testCases[index].id, input: testCases[index].input, expected: testCases[index].expected, actual: result.error, status: 'failed' }
      : compareCase(testCases[index], result.stdout.trim(), result.timeMs));
  }
  return outcomes;
};

function compareCase(tc, rawActual, timeMs) {
    const actual = rawActual;
    const expected = String(tc.expected).trim();
    let same = actual.trim() === expected;
    if (!same) {
      try {
        const actualValue = JSON.parse(actual);
        const expectedValue = JSON.parse(expected);
        const canonical = value => {
          if (Array.isArray(value)) {
            const items = value.map(canonical);
            return tc.setupSql ? items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : items;
          }
          if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
          return value;
        };
        same = JSON.stringify(canonical(actualValue)) === JSON.stringify(canonical(expectedValue));
      } catch { /* compare normalized text */ }
    }
    return { id: tc.id, input: tc.input, expected: tc.expected, actual, status: same ? 'passed' : 'failed', executionTimeMs: timeMs };
}
