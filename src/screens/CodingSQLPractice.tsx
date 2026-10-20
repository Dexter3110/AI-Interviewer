import { useEffect, useRef, useState } from 'react'
import type { Screen } from '../types'
import { api } from '../api/api'
import {
  Code2,
  Database,
  Play,
  Send,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Terminal,
  BookOpen,
} from 'lucide-react'

interface Props {
  onNavigate: (s: Screen) => void
}

interface TestCase {
  id: number
  input: string
  expected: string
  actual?: string
  status?: 'passed' | 'failed' | 'pending'
  executionTimeMs?: number
  args?: unknown[]
  stdin?: string
  setupSql?: string
  query?: string
}

interface Problem {
  id: string
  title: string
  mode: 'coding' | 'sql'
  category: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  language: string
  description: string
  constraints: string[]
  examples: { input: string; output: string; explanation?: string }[]
  starterCode: string
  testCases: TestCase[]
  functionName?: string
  className?: string
}

function getStarterSyntaxTemplate(title: string, language: string, mode: 'coding' | 'sql'): string {
  const lang = (language || '').toLowerCase()

  if (mode === 'sql') {
    return `-- Write your SQL query below for: ${title}
SELECT 
    -- TODO: Add SELECT columns
FROM 
    -- TODO: Add FROM table and JOIN / WHERE conditions;
`
  }

  // Java
  if (lang.includes('java') && !lang.includes('script')) {
    if (title.includes('Longest Substring')) {
      return `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // TODO: Write your solution here
        return 0;
    }
}

`
    }
    if (title.includes('Two Sum')) {
      return `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // TODO: Write your solution here
        return new int[]{};
    }
}
`
    }
    return `class Solution {
    public int maxSubArray(int[] nums) {
        // TODO: Write your solution here
        return 0;
    }
}
`
  }

  // Python
  if (lang.includes('python')) {
    if (title.includes('Longest Substring')) {
      return `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # TODO: Write your solution here
        pass
`
    }
    if (title.includes('Two Sum')) {
      return `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # TODO: Write your solution here
        pass
`
    }
    return `class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        # TODO: Write your solution here
        pass
`
  }

  // C++
  if (lang.includes('c++') || lang.includes('cpp')) {
    if (title.includes('Longest Substring')) {
      return `#include <string>
using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // TODO: Write your solution here
        return 0;
    }
};
`
    }
    if (title.includes('Two Sum')) {
      return `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // TODO: Write your solution here
        return {};
    }
};
`
    }
    return `#include <vector>
using namespace std;

class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // TODO: Write your solution here
        return 0;
    }
};
`
  }

  // JavaScript
  if (lang.includes('javascript')) {
    if (title.includes('Longest Substring')) {
      return `/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
    // TODO: Write your solution here
    return 0;
}
`
    }
    if (title.includes('Two Sum')) {
      return `function twoSum(nums, target) {
    // TODO: Write your solution here
    return [];
}
`
    }
    return `function maxSubArray(nums) {
    // TODO: Write your solution here
    return 0;
}
`
  }

  // TypeScript
  if (lang.includes('typescript')) {
    if (title.includes('Longest Substring')) {
      return `function lengthOfLongestSubstring(s: string): number {
    // TODO: Write your solution here
    return 0;
}
`
    }
    if (title.includes('Two Sum')) {
      return `function twoSum(nums: number[], target: number): number[] {
    // TODO: Write your solution here
    return [];
}
`
    }
    return `function maxSubArray(nums: number[]): number {
    // TODO: Write your solution here
    return 0;
}
`
  }

  // Go
  if (lang.includes('go')) {
    if (title.includes('Longest Substring')) {
      return `package main

func lengthOfLongestSubstring(s string) int {
    // TODO: Write your solution here
    return 0
}
`
    }
    if (title.includes('Two Sum')) {
      return `package main

func twoSum(nums []int, target int) []int {
    // TODO: Write your solution here
    return []int{}
}
`
    }
    return `package main

func maxSubArray(nums []int) int {
    // TODO: Write your solution here
    return 0
}
`
  }

  return `// Write your solution here for ${title}\n`
}

function displayText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

function departmentSqlCase(id: number, input: string, employees: Array<[string, number | null, number]>, expected: Array<{ Department: string; Employee: string; Salary: number }>): TestCase {
  const employeeRows = employees.map(([name, salary, department], index) => `(${index + 1}, '${name}', ${salary === null ? 'NULL' : salary}, ${department})`).join(', ')
  return {
    id, input, expected: JSON.stringify(expected),
    setupSql: `CREATE TABLE Department (id INTEGER, name TEXT); CREATE TABLE Employee (id INTEGER, name TEXT, salary INTEGER, departmentId INTEGER); INSERT INTO Department VALUES (1, 'IT'), (2, 'Sales'); INSERT INTO Employee VALUES ${employeeRows};`,
  }
}

function mauSqlCase(id: number, input: string, rows: Array<[number, string]>, expectedCount: number): TestCase {
  const actions = rows.map(([user, date], index) => `(${index + 1}, ${user}, 'event', '${date}')`).join(', ')
  return {
    id, input, expected: JSON.stringify([{ monthly_active_users: expectedCount }]),
    setupSql: `CREATE TABLE user_actions (event_id INTEGER, user_id INTEGER, event_type TEXT, event_date TEXT); INSERT INTO user_actions VALUES ${actions};`,
  }
}

const PRESET_PROBLEMS: Problem[] = [
  {
    id: 'coding-1',
    title: 'Longest Substring Without Repeating Characters',
    mode: 'coding',
    category: 'Arrays & Sliding Window',
    difficulty: 'Medium',
    language: 'Python',
    description:
      'Given a string `s`, find the length of the longest substring without repeating characters.\n\nYour algorithm should run in linear O(N) time complexity.',
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.',
      'Target Time Complexity: O(N)',
      'Target Space Complexity: O(min(N, M))',
    ],
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with length 3.' },
      { input: 's = "bbbbb"', output: '1', explanation: 'The answer is "b", with length 1.' },
      { input: 's = "pwwkew"', output: '3', explanation: 'The answer is "wke", with length 3.' },
    ],
    starterCode: getStarterSyntaxTemplate('Longest Substring Without Repeating Characters', 'Python', 'coding'),
    testCases: [
      { id: 1, input: '"abcabcbb"', expected: '3' },
      { id: 2, input: '"bbbbb"', expected: '1' },
      { id: 3, input: '"pwwkew"', expected: '3' },
      { id: 4, input: '""', expected: '0' },
      { id: 5, input: '"aab"', expected: '2' },
    ],
  },
  {
    id: 'coding-2',
    title: 'Two Sum Target Pair',
    mode: 'coding',
    category: 'Arrays & Hash Maps',
    difficulty: 'Easy',
    language: 'Python',
    description:
      'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0, 1]' },
      { input: 'nums = [3,2,4], target = 6', output: '[1, 2]' },
    ],
    starterCode: getStarterSyntaxTemplate('Two Sum Target Pair', 'Python', 'coding'),
    testCases: [
      { id: 1, input: 'nums = [2,7,11,15], target = 9', expected: '[0, 1]' },
      { id: 2, input: 'nums = [3,2,4], target = 6', expected: '[1, 2]' },
      { id: 3, input: 'nums = [3,3], target = 6', expected: '[0, 1]' },
      { id: 4, input: 'nums = [-1,-8,9], target = 1', expected: '[1, 2]' },
      { id: 5, input: 'nums = [0,4,3,0], target = 0', expected: '[0, 3]' },
    ],
  },
  {
    id: 'sql-1',
    title: 'Highest Earning Employee per Department',
    mode: 'sql',
    category: 'SQL Aggregations & Joins',
    difficulty: 'Hard',
    language: 'SQLite',
    description:
      'Write an SQL query to find employees who have the highest salary in each of the departments.\n\nReturn the result table in any order containing Department Name, Employee Name, and Salary.',
    constraints: [
      'Table: Employee (id, name, salary, departmentId)',
      'Table: Department (id, name)',
      'Output columns: Department, Employee, Salary',
      'Handle ties where multiple employees share maximum salary',
    ],
    examples: [
      {
        input: 'Employee: [(1,"Joe",70000,1), (2,"Jim",90000,1), (3,"Henry",80000,2)], Department: [(1,"IT"), (2,"Sales")]',
        output: 'Department | Employee | Salary\nIT | Jim | 90000\nSales | Henry | 80000',
      },
    ],
    starterCode: getStarterSyntaxTemplate('Highest Earning Employee per Department', 'PostgreSQL', 'sql'),
    testCases: [
      departmentSqlCase(1, 'Standard department maxima', [['Joe', 70000, 1], ['Jim', 90000, 1], ['Henry', 80000, 2]], [{ Department: 'IT', Employee: 'Jim', Salary: 90000 }, { Department: 'Sales', Employee: 'Henry', Salary: 80000 }]),
      departmentSqlCase(2, 'Tied highest salaries', [['Amy', 100000, 1], ['Bob', 100000, 1], ['Cal', 80000, 2]], [{ Department: 'IT', Employee: 'Amy', Salary: 100000 }, { Department: 'IT', Employee: 'Bob', Salary: 100000 }, { Department: 'Sales', Employee: 'Cal', Salary: 80000 }]),
      departmentSqlCase(3, 'Single employee department', [['Lee', 50000, 1]], [{ Department: 'IT', Employee: 'Lee', Salary: 50000 }]),
      departmentSqlCase(4, 'Null salary rows', [['Nia', null, 1], ['Sam', 60000, 1]], [{ Department: 'IT', Employee: 'Sam', Salary: 60000 }]),
      departmentSqlCase(5, 'Multiple department join', [['Ari', 30000, 1], ['Bo', 45000, 1], ['Cy', 70000, 2], ['Dee', 65000, 2]], [{ Department: 'IT', Employee: 'Bo', Salary: 45000 }, { Department: 'Sales', Employee: 'Cy', Salary: 70000 }]),
    ],
  },
  {
    id: 'sql-2',
    title: 'Calculate Monthly Active Users (MAU) Retention',
    mode: 'sql',
    category: 'Window Functions & Date Math',
    difficulty: 'Medium',
    language: 'SQLite',
    description:
      'Write an SQL query to calculate the count of Monthly Active Users who performed an event in both June 2024 and July 2024.\n\nUse the `user_actions` table containing `user_id`, `event_id`, `event_type`, and `event_date`.',
    constraints: [
      'Table: user_actions (user_id INT, event_id INT, event_type VARCHAR, event_date DATETIME)',
      'Time period: June 2024 vs July 2024',
      'Count distinct active users',
    ],
    examples: [
      { input: 'user_actions logs for June & July 2024', output: 'monthly_active_users: 1420' },
    ],
    starterCode: getStarterSyntaxTemplate('Calculate Monthly Active Users (MAU) Retention', 'SQL', 'sql'),
    testCases: [
      mauSqlCase(1, 'Users active in both June and July', [[1, '2024-06-04'], [1, '2024-07-08'], [2, '2024-06-20'], [2, '2024-07-11'], [3, '2024-06-10']], 2),
      mauSqlCase(2, 'Users active in June only are excluded', [[1, '2024-06-04'], [1, '2024-07-08'], [2, '2024-06-20']], 1),
      mauSqlCase(3, 'Repeated actions count each user once', [[1, '2024-06-04'], [1, '2024-06-05'], [1, '2024-07-08'], [1, '2024-07-09']], 1),
      mauSqlCase(4, 'Dates in other years are excluded', [[1, '2023-06-04'], [1, '2023-07-08'], [2, '2024-06-04'], [2, '2024-07-08']], 1),
      mauSqlCase(5, 'No overlap returns zero', [[1, '2024-06-01'], [2, '2024-07-01']], 0),
    ],
  },
]

export default function CodingSQLPractice({ onNavigate: _onNavigate }: Props) {
  const leftPaneRef = useRef<HTMLDivElement>(null)
  const [generationCount, setGenerationCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'coding' | 'sql'>('coding')
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [code, setCode] = useState(PRESET_PROBLEMS[0].starterCode)
  const [selectedLanguage, setSelectedLanguage] = useState(PRESET_PROBLEMS[0].language)
  const [testCases, setTestCases] = useState<TestCase[]>(PRESET_PROBLEMS[0].testCases)
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [runSummary, setRunSummary] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<{
    score: number
    feedback: string
    complexity: string
    passedCount: number
    totalCount: number
    correctness?: string
    approach?: string
    complexityNotes?: string
    codeQuality?: string
    edgeCases?: string
    strengths?: string[]
    missingPoints?: string[]
  } | null>(null)

  const currentProblem = PRESET_PROBLEMS[currentProblemIndex] || PRESET_PROBLEMS[0]

  useEffect(() => {
    if (evaluation) leftPaneRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [evaluation])

  const handleSelectProblem = (p: Problem, idx: number) => {
    setCurrentProblemIndex(idx)
    setSelectedLanguage(p.language)
    setCode(p.starterCode)
    setTestCases(p.testCases.map(tc => ({ ...tc, status: 'pending', actual: undefined })))
    setEvaluation(null)
    setRunSummary(null)
  }

  const handleSwitchTab = (tab: 'coding' | 'sql') => {
    setActiveTab(tab)
    const firstMatchIdx = PRESET_PROBLEMS.findIndex(p => p.mode === tab)
    if (firstMatchIdx !== -1) {
      handleSelectProblem(PRESET_PROBLEMS[firstMatchIdx], firstMatchIdx)
    }
  }

  const evaluateWithAI = async () => {
    setIsSubmitting(true)
    setEvaluation(null)
    try {
      const response: any = await api.evaluateCodingSQLSubmission({
        section: activeTab,
        scoreScale: 100,
        currentQuestion: currentProblem.description,
        answer: code,
        codingSubmission: {
          title: currentProblem.title,
          language: selectedLanguage,
          code,
          mode: activeTab,
          testCases: currentProblem.testCases,
        },
        setup: { codingLanguage: selectedLanguage, section: activeTab, difficulty: currentProblem.difficulty },
      })
      const result = response.evaluation || response
      const score = Math.max(0, Math.min(100, Number(result.score) || 0))
      const strengths = Array.isArray(result.strengths) ? result.strengths : []
      const missingPoints = Array.isArray(result.missingPoints) ? result.missingPoints : []
      const feedback = result.summary || result.correctness || 'AI review completed.'
      setEvaluation({
        score,
        passedCount: 0,
        totalCount: currentProblem.testCases.length,
        complexity: result.complexity || 'Static AI review · code not executed',
        feedback,
        correctness: result.correctness,
        approach: result.approach,
        complexityNotes: result.complexity,
        codeQuality: result.codeQuality || result.sqlQuality,
        edgeCases: result.edgeCases,
        strengths,
        missingPoints,
      })
    } catch (error) {
      setEvaluation({ score: 0, passedCount: 0, totalCount: currentProblem.testCases.length, complexity: 'AI service unavailable', feedback: error instanceof Error ? error.message : 'Could not reach the AI evaluation service.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRunTestCases = async () => {
    setIsRunning(true)
    setRunSummary(null)
    setEvaluation(null)
    setTestCases(currentProblem.testCases.map(tc => ({ ...tc, status: 'pending', actual: undefined })))
    try {
      const response: any = await api.runCodingSQLTests({
        code,
        language: selectedLanguage,
        problem: { title: currentProblem.title, mode: currentProblem.mode, functionName: currentProblem.functionName, className: currentProblem.className },
        testCases: currentProblem.testCases,
      })
      const results: TestCase[] = response.testCases
      const passed = results.filter(tc => tc.status === 'passed').length
      setTestCases(results)
      setRunSummary(`${passed} of ${results.length} test cases passed.`)
    } catch (error) {
      setRunSummary(error instanceof Error ? error.message : 'The code runner could not execute this solution.')
      setTestCases(currentProblem.testCases.map(tc => ({ ...tc, status: 'failed', actual: 'Runner error' })))
    } finally {
      setIsRunning(false)
    }
  }
  const handleSubmitSolution = () => evaluateWithAI()

  const handleGenerateAIProblem = async () => {
    setIsGenerating(true)
    try {
      const history = PRESET_PROBLEMS.filter(p => p.mode === activeTab).map(p => ({ title: p.title, description: p.description }))
      const response: any = await api.generateCodingSQLQuestion({
        section: activeTab,
        index: generationCount + 1,
        history,
        setup: { codingLanguage: selectedLanguage, difficulty: 'Medium', section: activeTab },
      })
      const q = response?.question || response || {}
      const questionTitle = typeof q.title === 'string' && q.title.trim() ? q.title.trim() : 'AI Generated Challenge'
      const questionDescription = q.description ?? q.problem ?? q.text ?? ''
      const newProblem: Problem = {
        id: `ai-${activeTab}-${Date.now()}`,
        title: questionTitle,
        mode: activeTab,
        category: typeof q.category === 'string' ? q.category : (activeTab === 'coding' ? 'Coding & Algorithms' : 'SQL & Databases'),
        difficulty: typeof q.difficulty === 'string' ? q.difficulty : 'Medium',
        language: selectedLanguage,
        description: displayText(questionDescription),
        constraints: Array.isArray(q.constraints) ? q.constraints.map(displayText).filter(Boolean) : [],
        examples: Array.isArray(q.examples) ? q.examples.map((example: any) => ({
          input: displayText(example?.input ?? example?.sampleInput ?? ''),
          output: displayText(example?.output ?? example?.expected ?? ''),
          explanation: example?.explanation == null ? undefined : displayText(example.explanation),
        })) : [],
        starterCode: typeof q.starterCode === 'string' && q.starterCode.trim()
          ? q.starterCode
          : getStarterSyntaxTemplate(questionTitle, selectedLanguage, activeTab),
        testCases: Array.isArray(q.testCases) ? q.testCases.slice(0, 5).map((tc: any, index: number) => ({ id: index + 1, input: displayText(tc.input ?? tc.args ?? ''), expected: displayText(tc.expected ?? tc.output ?? ''), args: Array.isArray(tc.args) ? tc.args : undefined, stdin: typeof tc.stdin === 'string' ? tc.stdin : undefined, setupSql: typeof tc.setupSql === 'string' ? tc.setupSql : undefined, query: typeof tc.query === 'string' ? tc.query : undefined })) : [],
        functionName: typeof q.functionName === 'string' ? q.functionName : undefined,
        className: typeof q.className === 'string' ? q.className : undefined,
      }
      if (!newProblem.description || !newProblem.testCases.length) throw new Error('The AI returned an incomplete question. Please try again.')
      PRESET_PROBLEMS.unshift(newProblem)
      setGenerationCount(count => count + 1)
      setCurrentProblemIndex(0)
      setCode(newProblem.starterCode)
      setTestCases(newProblem.testCases.map(tc => ({ ...tc, status: 'pending' })))
      setEvaluation(null)
      setRunSummary(null)
    } catch (error) {
      setEvaluation({ score: 0, passedCount: 0, totalCount: 0, complexity: 'Question generation unavailable', feedback: error instanceof Error ? error.message : 'Could not reach the AI question generation service.' })
    } finally {
      setIsGenerating(false)
    }
  }

  const filteredProblems = PRESET_PROBLEMS.filter(p => p.mode === activeTab)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAF9F5',
        color: '#172033',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* HEADER BAR */}
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid rgba(23,32,51,0.09)',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#3358E8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Terminal size={14} /> VIVA AI · PRACTICE SANDBOX
          </div>

          <h1
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 26,
              fontWeight: 700,
              margin: 0,
              color: '#172033',
            }}
          >
            Coding & SQL Practice Sandbox
          </h1>
        </div>

        {/* MODE SWITCHER TABS */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(23,32,51,0.05)',
            padding: 4,
            borderRadius: 12,
            gap: 4,
          }}
        >
          <button
            onClick={() => handleSwitchTab('coding')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 9,
              border: 'none',
              background: activeTab === 'coding' ? '#3358E8' : 'transparent',
              color: activeTab === 'coding' ? '#FFFFFF' : '#5B6478',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
          >
            <Code2 size={16} /> Coding & DSA
          </button>

          <button
            onClick={() => handleSwitchTab('sql')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 9,
              border: 'none',
              background: activeTab === 'sql' ? '#3358E8' : 'transparent',
              color: activeTab === 'sql' ? '#FFFFFF' : '#5B6478',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
          >
            <Database size={16} /> SQL & Databases
          </button>
        </div>

        {/* GENERATE AI PROBLEM BUTTON */}
        <button
          onClick={handleGenerateAIProblem}
          disabled={isGenerating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, #7B5CFA 0%, #3358E8 100%)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 13,
            cursor: isGenerating ? 'wait' : 'pointer',
            boxShadow: '0 4px 14px rgba(123,92,250,0.3)',
            opacity: isGenerating ? 0.75 : 1,
          }}
        >
          <Sparkles size={16} /> {isGenerating ? 'Generating Question…' : '⚡ Generate AI Question'}
        </button>
      </header>

      {/* QUICK PROBLEM SELECTOR BAR */}
      <div
        style={{
          background: '#FAF9F5',
          borderBottom: '1px solid rgba(23,32,51,0.08)',
          padding: '10px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          overflowX: 'auto',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#667085',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
          }}
        >
          <BookOpen size={14} /> Problem Set:
        </span>

        {filteredProblems.map((p, _idx) => {
          const globalIdx = PRESET_PROBLEMS.findIndex(x => x.id === p.id)
          const isSelected = globalIdx === currentProblemIndex
          return (
            <button
              key={p.id}
              onClick={() => handleSelectProblem(p, globalIdx)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: isSelected
                  ? '1px solid #3358E8'
                  : '1px solid rgba(23,32,51,0.12)',
                background: isSelected ? '#FFFFFF' : 'transparent',
                color: isSelected ? '#3358E8' : '#344054',
                fontWeight: isSelected ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: isSelected ? '0 2px 8px rgba(51,88,232,0.12)' : 'none',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background:
                    p.difficulty === 'Easy'
                      ? '#10b981'
                      : p.difficulty === 'Medium'
                      ? '#f59e0b'
                      : '#ef4444',
                }}
              />
              {p.title}
            </button>
          )
        })}
      </div>

      {/* MAIN TWO-PANE WORKSPACE */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 42%) 1fr',
          gap: 0,
          background: '#FAF9F5',
          overflow: 'hidden',
        }}
      >
        {/* LEFT PANE: PROBLEM STATEMENT */}
        <div
          ref={leftPaneRef}
          style={{
            background: '#FFFFFF',
            borderRight: '1px solid rgba(23,32,51,0.09)',
            padding: '24px 28px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 800,
                  background:
                    currentProblem.difficulty === 'Easy'
                      ? '#EAF7F0'
                      : currentProblem.difficulty === 'Medium'
                      ? '#FEF6E6'
                      : '#FEE4E2',
                  color:
                    currentProblem.difficulty === 'Easy'
                      ? '#16834D'
                      : currentProblem.difficulty === 'Medium'
                      ? '#B45309'
                      : '#D92D20',
                }}
              >
                {currentProblem.difficulty}
              </span>

              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(51,88,232,0.08)',
                  color: '#3358E8',
                }}
              >
                {currentProblem.category}
              </span>
            </div>

            <h2
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 22,
                fontWeight: 700,
                margin: '0 0 12px',
                color: '#172033',
              }}
            >
              {currentProblem.title}
            </h2>

            <div
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: '#344054',
                whiteSpace: 'pre-line',
              }}
            >
              {currentProblem.description}
            </div>
          </div>

          {evaluation && (
            <section
              aria-label="AI evaluation"
              style={{
                background: '#F0FDF4',
                border: '1px solid rgba(16,185,129,0.28)',
                borderLeft: '4px solid #10B981',
                borderRadius: 12,
                padding: 16,
                display: 'grid',
                gap: 12,
                minWidth: 0,
                color: '#172033',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Award size={20} color="#059669" />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#065F46' }}>AI evaluation</div>
                    <div style={{ fontSize: 11, color: '#527064', marginTop: 2 }}>
                      {evaluation.complexity === 'AI service unavailable'
                        ? 'AI review unavailable'
                        : 'Static AI review · Runtime tests not executed'}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    background: '#D1FAE5',
                    color: '#065F46',
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontSize: 15,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Score: {evaluation.score} / 100
                </div>
              </div>

              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: '#344054', overflowWrap: 'anywhere' }}>
                {evaluation.feedback}
              </p>

              <div style={{ display: 'grid', gap: 10, fontSize: 13.5, lineHeight: 1.65, color: '#344054' }}>
                {evaluation.correctness && <div><strong style={{ color: '#172033' }}>Correctness</strong><div>{evaluation.correctness}</div></div>}
                {evaluation.approach && <div><strong style={{ color: '#172033' }}>Approach</strong><div>{evaluation.approach}</div></div>}
                {(evaluation.complexityNotes || evaluation.complexity) && (
                  <div><strong style={{ color: '#172033' }}>Complexity</strong><div>{evaluation.complexityNotes || evaluation.complexity}</div></div>
                )}
                {evaluation.codeQuality && <div><strong style={{ color: '#172033' }}>Code / SQL quality</strong><div>{evaluation.codeQuality}</div></div>}
                {evaluation.edgeCases && <div><strong style={{ color: '#172033' }}>Edge cases</strong><div>{evaluation.edgeCases}</div></div>}
                {evaluation.strengths?.length ? (
                  <div>
                    <strong style={{ color: '#172033' }}>Strengths</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                      {evaluation.strengths.map((item, index) => <li key={`strength-${index}`}>{item}</li>)}
                    </ul>
                  </div>
                ) : null}
                {evaluation.missingPoints?.length ? (
                  <div>
                    <strong style={{ color: '#172033' }}>To improve</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                      {evaluation.missingPoints.map((item, index) => <li key={`improvement-${index}`}>{item}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {/* EXAMPLES */}
          <div>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#172033',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 10,
              }}
            >
              Examples
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentProblem.examples.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    background: '#FAF9F5',
                    border: '1px solid rgba(23,32,51,0.08)',
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, monospace',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                  }}
                >
                  <div style={{ color: '#5B6478', marginBottom: 4 }}>
                    <strong>Input:</strong> {ex.input}
                  </div>
                  <div style={{ color: '#172033', fontWeight: 700 }}>
                    <strong>Output:</strong> {ex.output}
                  </div>
                  {ex.explanation && (
                    <div
                      style={{
                        color: '#667085',
                        fontSize: 12,
                        marginTop: 4,
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <em>{ex.explanation}</em>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CONSTRAINTS */}
          <div>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#172033',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 10,
              }}
            >
              Constraints & Target Complexity
            </h3>

            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 13,
                color: '#475467',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {currentProblem.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT PANE: CODE EDITOR & TEST CONSOLE */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: '#10142A',
            color: '#F0F4FF',
            overflow: 'hidden',
          }}
        >
          {/* EDITOR TOOLBAR */}
          <div
            style={{
              background: '#171B33',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Code2 size={14} color="#7B5CFA" /> Language:
              </span>

              <select
                value={selectedLanguage}
                onChange={e => {
                  const newLang = e.target.value
                  setSelectedLanguage(newLang)
                  setCode(getStarterSyntaxTemplate(currentProblem.title, newLang, activeTab))
                  setEvaluation(null)
                  setRunSummary(null)
                  setTestCases(currentProblem.testCases.map(tc => ({ ...tc, status: 'pending', actual: undefined })))
                }}
                style={{
                  background: '#1E2342',
                  color: '#F8FAFC',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {activeTab === 'coding' ? (
                  <>
                    <option value="Python">Python 3</option>
                    <option value="JavaScript">JavaScript (Node.js)</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="Java">Java 17</option>
                    <option value="C++">C++ 20</option>
                    <option value="Go">Go 1.21</option>
                  </>
                ) : (
                  <>
                    <option value="SQLite">SQLite 3 (test runner)</option>
                  </>
                )}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => {
                  setCode(selectedLanguage === currentProblem.language ? currentProblem.starterCode : getStarterSyntaxTemplate(currentProblem.title, selectedLanguage, activeTab))
                  setEvaluation(null)
                  setRunSummary(null)
                  setTestCases(currentProblem.testCases.map(tc => ({ ...tc, status: 'pending', actual: undefined })))
                }}
                style={{
                  background: 'transparent',
                  color: '#94A3B8',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 7,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <RotateCcw size={13} /> Reset
              </button>

              <button
                onClick={handleRunTestCases}
                disabled={isRunning || isSubmitting}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 7,
                  padding: '6px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isRunning ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Play size={14} fill="#FFFFFF" /> {isRunning ? 'Running…' : 'Run Test Cases'}
              </button>

              <button
                onClick={handleSubmitSolution}
                disabled={isSubmitting || isRunning}
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 7,
                  padding: '6px 18px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
                }}
              >
                <Send size={14} /> {isSubmitting ? 'Evaluating…' : 'Submit Solution'}
              </button>
            </div>
          </div>

          {/* CODE EDITOR TEXTAREA */}
          <div style={{ flex: 1, position: 'relative', background: '#0D1126' }}>
            <textarea
              value={code}
              onChange={e => {
                setCode(e.target.value)
                setEvaluation(null)
                setRunSummary(null)
                setTestCases(currentProblem.testCases.map(tc => ({ ...tc, status: 'pending', actual: undefined })))
              }}
              spellCheck={false}
              style={{
                width: '100%',
                height: '100%',
                background: 'transparent',
                color: '#E2E8F0',
                border: 'none',
                outline: 'none',
                padding: 20,
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Consolas, monospace',
                lineHeight: 1.6,
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* TEST CASES & VERIFICATION CONSOLE */}
          <div
            style={{
              height: 210,
              background: '#171B33',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              padding: '14px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12,
                fontWeight: 700,
                color: '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <span>Verification Test Cases</span>
              <span>
                {testCases.filter(t => t.status === 'passed').length} / {testCases.length} Passed
              </span>
            </div>
            {runSummary && (() => {
              const counts = runSummary.match(/^(\d+) of (\d+)/)
              const allPassed = Boolean(counts && Number(counts[1]) === Number(counts[2]) && Number(counts[2]) > 0)
              return <div style={{ color: allPassed ? '#34D399' : '#FCA5A5', fontSize: 12 }}>{runSummary}</div>
            })()}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 10,
                flex: 1,
              }}
            >
              {testCases.map((tc, idx) => (
                <div
                  key={tc.id}
                  style={{
                    background: '#1E2342',
                    border:
                      tc.status === 'passed'
                        ? '1px solid rgba(16,185,129,0.4)'
                        : tc.status === 'failed'
                        ? '1px solid rgba(239,68,68,0.4)'
                        : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    fontSize: 11,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#E2E8F0' }}>Test {idx + 1}</span>
                    {tc.status === 'passed' ? (
                      <CheckCircle2 size={14} color="#10B981" />
                    ) : tc.status === 'failed' ? (
                      <XCircle size={14} color="#EF4444" />
                    ) : (
                      <Clock size={13} color="#64748B" />
                    )}
                  </div>

                  <div
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#94A3B8',
                      fontSize: 10.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      margin: '4px 0',
                    }}
                  >
                    {tc.input}
                  </div>

                  {tc.status && tc.status !== 'pending' && <div title={`Expected: ${tc.expected}\nActual: ${tc.actual ?? ''}`} style={{ fontSize: 9.5, color: tc.status === 'passed' ? '#86EFAC' : '#FCA5A5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Expected: {tc.expected} · Actual: {tc.actual ?? ''}
                  </div>}

                  <div style={{ fontSize: 10, color: tc.status === 'passed' ? '#34D399' : '#94A3B8' }}>
                    {tc.status === 'passed'
                      ? `Passed (${tc.executionTimeMs}ms)`
                      : tc.status === 'failed'
                      ? `Failed · ${tc.actual || 'Output mismatch'}`
                      : 'Ready to run'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
