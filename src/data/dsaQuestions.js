// A small, curated bank of Python DSA problems with verified test cases.
// Kept static (not AI-generated) so the test cases are always correct and
// consistent — grading relies on them being right every time.

const dsaQuestions = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    topic: "Arrays / Hashing",
    functionName: "two_sum",
    signature: "def two_sum(nums, target):",
    description:
      "Given a list of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. You may assume exactly one valid answer exists, and you may not use the same element twice.",
    examples: [
      {
        input: "nums = [2, 7, 11, 15], target = 9",
        output: "[0, 1]",
        explanation: "nums[0] + nums[1] == 9, so return their indices.",
      },
    ],
    hints: [
      "A hash map lets you check for the needed complement in one pass.",
      "For each number, check whether `target - number` has already been seen.",
    ],
    testCases: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
    ],
  },
  {
    id: "valid-anagram",
    title: "Valid Anagram",
    difficulty: "Easy",
    topic: "Strings / Hashing",
    functionName: "is_anagram",
    signature: "def is_anagram(s, t):",
    description:
      "Given two strings `s` and `t`, return True if `t` is an anagram of `s` (uses exactly the same letters, same counts), and False otherwise.",
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: "True" },
      { input: 's = "rat", t = "car"', output: "False" },
    ],
    hints: [
      "Different lengths can never be anagrams — check that first.",
      "Counting character frequencies (e.g. with a dictionary or Counter) is a reliable approach.",
    ],
    testCases: [
      { args: ["anagram", "nagaram"], expected: true },
      { args: ["rat", "car"], expected: false },
      { args: ["a", "a"], expected: true },
      { args: ["ab", "a"], expected: false },
    ],
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    topic: "Stack",
    functionName: "is_valid",
    signature: "def is_valid(s):",
    description:
      "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. Brackets must close in the correct order and every open bracket must have a matching close of the same type.",
    examples: [
      { input: 's = "()[]{}"', output: "True" },
      { input: 's = "(]"', output: "False" },
    ],
    hints: [
      "A stack is the classic tool here: push opening brackets, pop and check on closing ones.",
      "If you ever try to pop from an empty stack, or the popped bracket doesn't match, the string is invalid.",
    ],
    testCases: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
      { args: ["(]"], expected: false },
      { args: ["([)]"], expected: false },
      { args: ["{[]}"], expected: true },
    ],
  },
  {
    id: "max-subarray",
    title: "Maximum Subarray",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    functionName: "max_sub_array",
    signature: "def max_sub_array(nums):",
    description:
      "Given an integer array `nums`, find the contiguous subarray (containing at least one number) with the largest sum, and return that sum. Aim for an O(n) solution (Kadane's algorithm).",
    examples: [
      {
        input: "nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]",
        output: "6",
        explanation: "The subarray [4, -1, 2, 1] has the largest sum, 6.",
      },
    ],
    hints: [
      "At each position, decide: extend the previous subarray, or start a new one here.",
      "Keep a running 'current sum' and a 'best sum seen so far'.",
    ],
    testCases: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { args: [[1]], expected: 1 },
      { args: [[5, 4, -1, 7, 8]], expected: 23 },
      { args: [[-1, -2, -3]], expected: -1 },
    ],
  },
  {
    id: "longest-common-prefix",
    title: "Longest Common Prefix",
    difficulty: "Easy",
    topic: "Strings",
    functionName: "longest_common_prefix",
    signature: "def longest_common_prefix(strs):",
    description:
      "Given a list of strings `strs`, return the longest common prefix string amongst all of them. If there is no common prefix, return an empty string `\"\"`.",
    examples: [
      { input: 'strs = ["flower", "flow", "flight"]', output: '"fl"' },
      { input: 'strs = ["dog", "racecar", "car"]', output: '""' },
    ],
    hints: [
      "Try comparing character-by-character across all strings at the same position.",
      "You can also start with the first string as your candidate prefix and shrink it as needed.",
    ],
    testCases: [
      { args: [["flower", "flow", "flight"]], expected: "fl" },
      { args: [["dog", "racecar", "car"]], expected: "" },
      { args: [["interview", "internet", "interval"]], expected: "inter" },
      { args: [["single"]], expected: "single" },
    ],
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Medium",
    topic: "Arrays / Sorting",
    functionName: "merge_intervals",
    signature: "def merge_intervals(intervals):",
    description:
      "Given a list of intervals where `intervals[i] = [start, end]`, merge all overlapping intervals and return a list of the non-overlapping intervals that cover all the intervals in the input, sorted by start.",
    examples: [
      {
        input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        output: "[[1,6],[8,10],[15,18]]",
        explanation: "[1,3] and [2,6] overlap, so they merge into [1,6].",
      },
    ],
    hints: [
      "Sort the intervals by their start value first — this makes overlaps easy to spot in one pass.",
      "Keep a 'current merged interval' and extend its end whenever the next interval overlaps it.",
    ],
    testCases: [
      {
        args: [[[1, 3], [2, 6], [8, 10], [15, 18]]],
        expected: [[1, 6], [8, 10], [15, 18]],
      },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { args: [[[1, 4], [2, 3]]], expected: [[1, 4]] },
    ],
  },
];

export default dsaQuestions;