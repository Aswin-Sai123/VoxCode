/**
 * Coding Problem Engine
 * File: backend/src/services/codingProblemEngine.js
 * 
 * Adaptive coding challenge selector and catalog manager matching candidate CRI signals,
 * weak topics, and company focus areas with curated multi-language problem specifications.
 */

export const CURATED_PROBLEM_CATALOG = [
    // --- EASY ---
    {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
        topics: ['arrays', 'hash-tables', 'algorithms'],
        companies: ['Google', 'Meta', 'Amazon', 'Stripe', 'Apple', 'Microsoft'],
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
        functionDescription: 'Return an array of two indices [i, j] where nums[i] + nums[j] === target.',
        inputFormat: 'JSON string: [nums, target]',
        outputFormat: 'JSON array of indices [i, j]',
        constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9', 'Only one valid answer exists.'],
        timeComplexityTarget: 'O(n)',
        spaceComplexityTarget: 'O(n)',
        starterCode: {
            javascript: `function twoSum(nums, target) {\n    // Implement O(n) solution using a Hash Map\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (map.has(complement)) {\n            return [map.get(complement), i];\n        }\n        map.set(nums[i], i);\n    }\n    return [];\n}`,
            python: `def twoSum(nums, target):\n    # Implement O(n) solution using a dict\n    seen = {}\n    for i, n in enumerate(nums):\n        complement = target - n\n        if complement in seen:\n            return [seen[complement], i]\n        seen[n] = i\n    return []`
        },
        sampleTestCases: [
            { input: '[[2, 7, 11, 15], 9]', expectedOutput: '[0, 1]', explanation: 'nums[0] + nums[1] = 2 + 7 = 9' },
            { input: '[[3, 2, 4], 6]', expectedOutput: '[1, 2]', explanation: 'nums[1] + nums[2] = 2 + 4 = 6' }
        ],
        testCases: [
            { input: '[[2, 7, 11, 15], 9]', expectedOutput: '[0, 1]' },
            { input: '[[3, 2, 4], 6]', expectedOutput: '[1, 2]' },
            { input: '[[3, 3], 6]', expectedOutput: '[0, 1]' },
            { input: '[[-1, -2, -3, -4, -5], -8]', expectedOutput: '[2, 4]' }
        ]
    },
    {
        id: 'valid-parentheses',
        title: 'Valid Parentheses',
        difficulty: 'easy',
        topics: ['stacks', 'strings', 'data-structures'],
        companies: ['Meta', 'Amazon', 'Bloomberg', 'Google'],
        description: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
        functionDescription: 'Return boolean true if every open bracket is closed by the same type of bracket in the correct order.',
        inputFormat: 'String s',
        outputFormat: 'Boolean true or false',
        constraints: ['1 <= s.length <= 10^4', 's consists of parentheses only "()[]{}"'],
        timeComplexityTarget: 'O(n)',
        spaceComplexityTarget: 'O(n)',
        starterCode: {
            javascript: `function isValid(s) {\n    const stack = [];\n    const pairs = { ')': '(', '}': '{', ']': '[' };\n    for (const char of s) {\n        if (['(', '{', '['].includes(char)) {\n            stack.push(char);\n        } else if (pairs[char]) {\n            if (stack.pop() !== pairs[char]) return false;\n        }\n    }\n    return stack.length === 0;\n}`,
            python: `def isValid(s):\n    stack = []\n    pairs = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in '({[':\n            stack.append(char)\n        elif char in pairs:\n            if not stack or stack.pop() != pairs[char]:\n                return False\n    return len(stack) == 0`
        },
        sampleTestCases: [
            { input: '"()"', expectedOutput: 'true', explanation: 'Matching round brackets' },
            { input: '"()[]{}"', expectedOutput: 'true', explanation: 'All pairs properly closed' },
            { input: '"(]"', expectedOutput: 'false', explanation: 'Mismatched closing bracket' }
        ],
        testCases: [
            { input: '"()"', expectedOutput: 'true' },
            { input: '"()[]{}"', expectedOutput: 'true' },
            { input: '"(]"', expectedOutput: 'false' },
            { input: '"([)]"', expectedOutput: 'false' },
            { input: '"{[]}"', expectedOutput: 'true' }
        ]
    },
    {
        id: 'best-time-to-buy-and-sell-stock',
        title: 'Best Time to Buy and Sell Stock',
        difficulty: 'easy',
        topics: ['arrays', 'dynamic-programming', 'greedy'],
        companies: ['Amazon', 'Apple', 'Meta', 'Uber'],
        description: 'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.',
        functionDescription: 'Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.',
        inputFormat: 'JSON array of prices',
        outputFormat: 'Integer maximum profit',
        constraints: ['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4'],
        timeComplexityTarget: 'O(n)',
        spaceComplexityTarget: 'O(1)',
        starterCode: {
            javascript: `function maxProfit(prices) {\n    let minPrice = Infinity;\n    let maxProfit = 0;\n    for (const p of prices) {\n        if (p < minPrice) minPrice = p;\n        else if (p - minPrice > maxProfit) maxProfit = p - minPrice;\n    }\n    return maxProfit;\n}`,
            python: `def maxProfit(prices):\n    min_price = float('inf')\n    max_profit = 0\n    for p in prices:\n        if p < min_price:\n            min_price = p\n        elif p - min_price > max_profit:\n            max_profit = p - min_price\n    return max_profit`
        },
        sampleTestCases: [
            { input: '[7, 1, 5, 3, 6, 4]', expectedOutput: '5', explanation: 'Buy day 2 (1) and sell day 5 (6), profit = 5' },
            { input: '[7, 6, 4, 3, 1]', expectedOutput: '0', explanation: 'No transactions are done and max profit = 0' }
        ],
        testCases: [
            { input: '[7, 1, 5, 3, 6, 4]', expectedOutput: '5' },
            { input: '[7, 6, 4, 3, 1]', expectedOutput: '0' },
            { input: '[2, 4, 1]', expectedOutput: '2' }
        ]
    },

    // --- MEDIUM ---
    {
        id: 'lru-cache',
        title: 'LRU Cache Implementation',
        difficulty: 'medium',
        topics: ['design', 'hash-tables', 'linked-lists', 'data-structures'],
        companies: ['Stripe', 'Google', 'Amazon', 'Meta', 'Netflix', 'Microsoft'],
        description: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement LRUCache with get(key) and put(key, value) in O(1) average time complexity.',
        functionDescription: 'Simulate LRUCache operations: actions ["put", "get"], args [[k, v], [k]]. Return output array.',
        inputFormat: 'JSON string: [capacity, operations, arguments]',
        outputFormat: 'JSON array of outputs (null for put, integer or -1 for get)',
        constraints: ['1 <= capacity <= 3000', '0 <= key <= 10^4', '0 <= value <= 10^5', 'At most 2 * 10^5 calls to get and put.'],
        timeComplexityTarget: 'O(1) per operation',
        spaceComplexityTarget: 'O(capacity)',
        starterCode: {
            javascript: `class LRUCache {\n    constructor(capacity) {\n        this.capacity = capacity;\n        this.cache = new Map();\n    }\n    get(key) {\n        if (!this.cache.has(key)) return -1;\n        const val = this.cache.get(key);\n        this.cache.delete(key);\n        this.cache.set(key, val);\n        return val;\n    }\n    put(key, value) {\n        if (this.cache.has(key)) this.cache.delete(key);\n        else if (this.cache.size >= this.capacity) {\n            this.cache.delete(this.cache.keys().next().value);\n        }\n        this.cache.set(key, value);\n    }\n}\n\nfunction runLRU(capacity, ops, args) {\n    const lru = new LRUCache(capacity);\n    const out = [];\n    for (let i = 0; i < ops.length; i++) {\n        if (ops[i] === 'put') { lru.put(args[i][0], args[i][1]); out.push(null); }\n        else if (ops[i] === 'get') { out.push(lru.get(args[i][0])); }\n    }\n    return out;\n}`,
            python: `from collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.capacity = capacity\n        self.cache = OrderedDict()\n    def get(self, key: int) -> int:\n        if key not in self.cache:\n            return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n    def put(self, key: int, value: int) -> None:\n        if key in self.cache:\n            self.cache.move_to_end(key)\n        elif len(self.cache) >= self.capacity:\n            self.cache.popitem(last=False)\n        self.cache[key] = value`
        },
        sampleTestCases: [
            {
                input: '[2, ["put","put","get","put","get","put","get","get","get"], [[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]]',
                expectedOutput: '[null,null,1,null,-1,null,-1,3,4]',
                explanation: 'Standard LRU eviction sequence'
            }
        ],
        testCases: [
            {
                input: '[2, ["put","put","get","put","get","put","get","get","get"], [[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]]',
                expectedOutput: '[null,null,1,null,-1,null,-1,3,4]'
            }
        ]
    },
    {
        id: 'longest-substring-without-repeating-characters',
        title: 'Longest Substring Without Repeating Characters',
        difficulty: 'medium',
        topics: ['sliding-window', 'strings', 'hash-tables', 'algorithms'],
        companies: ['Google', 'Meta', 'Amazon', 'Stripe', 'Uber'],
        description: 'Given a string s, find the length of the longest substring without duplicate characters.',
        functionDescription: 'Return the maximum length of a non-repeating substring.',
        inputFormat: 'String s',
        outputFormat: 'Integer length',
        constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces.'],
        timeComplexityTarget: 'O(n)',
        spaceComplexityTarget: 'O(min(n, m))',
        starterCode: {
            javascript: `function lengthOfLongestSubstring(s) {\n    let maxLen = 0;\n    let start = 0;\n    const map = new Map();\n    for (let i = 0; i < s.length; i++) {\n        const char = s[i];\n        if (map.has(char) && map.get(char) >= start) {\n            start = map.get(char) + 1;\n        }\n        map.set(char, i);\n        maxLen = Math.max(maxLen, i - start + 1);\n    }\n    return maxLen;\n}`,
            python: `def lengthOfLongestSubstring(s):\n    max_len = 0\n    start = 0\n    seen = {}\n    for i, c in enumerate(s):\n        if c in seen and seen[c] >= start:\n            start = seen[c] + 1\n        seen[c] = i\n        max_len = max(max_len, i - start + 1)\n    return max_len`
        },
        sampleTestCases: [
            { input: '"abcabcbb"', expectedOutput: '3', explanation: 'The answer is "abc", with length 3.' },
            { input: '"bbbbb"', expectedOutput: '1', explanation: 'The answer is "b", with length 1.' },
            { input: '"pwwkew"', expectedOutput: '3', explanation: 'The answer is "wke", with length 3.' }
        ],
        testCases: [
            { input: '"abcabcbb"', expectedOutput: '3' },
            { input: '"bbbbb"', expectedOutput: '1' },
            { input: '"pwwkew"', expectedOutput: '3' },
            { input: '""', expectedOutput: '0' },
            { input: '"dvdf"', expectedOutput: '3' }
        ]
    },
    {
        id: 'number-of-islands',
        title: 'Number of Islands',
        difficulty: 'medium',
        topics: ['graphs', 'bfs', 'dfs', 'matrix'],
        companies: ['Amazon', 'Google', 'Meta', 'Bloomberg', 'Microsoft'],
        description: 'Given an m x n 2D binary grid grid which represents a map of "1"s (land) and "0"s (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.',
        functionDescription: 'Count connected components of "1"s in grid.',
        inputFormat: 'JSON 2D array of characters/strings',
        outputFormat: 'Integer number of islands',
        constraints: ['m == grid.length', 'n == grid[i].length', '1 <= m, n <= 300', 'grid[i][j] is "0" or "1".'],
        timeComplexityTarget: 'O(m * n)',
        spaceComplexityTarget: 'O(m * n)',
        starterCode: {
            javascript: `function numIslands(grid) {\n    if (!grid || !grid.length) return 0;\n    let count = 0;\n    const m = grid.length, n = grid[0].length;\n    function dfs(r, c) {\n        if (r < 0 || c < 0 || r >= m || c >= n || grid[r][c] !== '1') return;\n        grid[r][c] = '0';\n        dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);\n    }\n    for (let i = 0; i < m; i++) {\n        for (let j = 0; j < n; j++) {\n            if (grid[i][j] === '1') {\n                count++;\n                dfs(i, j);\n            }\n        }\n    }\n    return count;\n}`,
            python: `def numIslands(grid):\n    if not grid: return 0\n    m, n = len(grid), len(grid[0])\n    count = 0\n    def dfs(r, c):\n        if r < 0 or c < 0 or r >= m or c >= n or grid[r][c] != '1':\n            return\n        grid[r][c] = '0'\n        dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)\n    for i in range(m):\n        for j in range(n):\n            if grid[i][j] == '1':\n                count += 1\n                dfs(i, j)\n    return count`
        },
        sampleTestCases: [
            {
                input: '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
                expectedOutput: '1',
                explanation: 'All lands form a single connected component'
            }
        ],
        testCases: [
            {
                input: '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
                expectedOutput: '1'
            },
            {
                input: '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
                expectedOutput: '3'
            }
        ]
    },
    {
        id: 'course-schedule',
        title: 'Course Schedule',
        difficulty: 'medium',
        topics: ['graphs', 'topological-sort', 'bfs', 'dfs'],
        companies: ['Google', 'Meta', 'Amazon', 'Stripe'],
        description: 'There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai. Return true if you can finish all courses.',
        functionDescription: 'Return boolean indicating if the directed graph of prerequisites has no cycle (is a DAG).',
        inputFormat: 'JSON string: [numCourses, prerequisites]',
        outputFormat: 'Boolean true or false',
        constraints: ['1 <= numCourses <= 2000', '0 <= prerequisites.length <= 5000', 'prerequisites[i].length == 2'],
        timeComplexityTarget: 'O(V + E)',
        spaceComplexityTarget: 'O(V + E)',
        starterCode: {
            javascript: `function canFinish(numCourses, prerequisites) {\n    const inDegree = new Array(numCourses).fill(0);\n    const adj = Array.from({ length: numCourses }, () => []);\n    for (const [course, pre] of prerequisites) {\n        adj[pre].push(course);\n        inDegree[course]++;\n    }\n    const queue = [];\n    for (let i = 0; i < numCourses; i++) {\n        if (inDegree[i] === 0) queue.push(i);\n    }\n    let count = 0;\n    while (queue.length > 0) {\n        const curr = queue.shift();\n        count++;\n        for (const next of adj[curr]) {\n            if (--inDegree[next] === 0) queue.push(next);\n        }\n    }\n    return count === numCourses;\n}`,
            python: `from collections import deque\n\ndef canFinish(numCourses, prerequisites):\n    in_degree = [0] * numCourses\n    adj = [[] for _ in range(numCourses)]\n    for course, pre in prerequisites:\n        adj[pre].append(course)\n        in_degree[course] += 1\n    queue = deque([i for i in range(numCourses) if in_degree[i] == 0])\n    visited = 0\n    while queue:\n        curr = queue.popleft()\n        visited += 1\n        for nxt in adj[curr]:\n            in_degree[nxt] -= 1\n            if in_degree[nxt] == 0:\n                queue.append(nxt)\n    return visited == numCourses`
        },
        sampleTestCases: [
            { input: '[2, [[1, 0]]]', expectedOutput: 'true', explanation: 'Course 0 then Course 1' },
            { input: '[2, [[1, 0], [0, 1]]]', expectedOutput: 'false', explanation: 'Cycle between 0 and 1' }
        ],
        testCases: [
            { input: '[2, [[1, 0]]]', expectedOutput: 'true' },
            { input: '[2, [[1, 0], [0, 1]]]', expectedOutput: 'false' },
            { input: '[3, [[0, 1], [0, 2], [1, 2]]]', expectedOutput: 'true' }
        ]
    },

    // --- HARD ---
    {
        id: 'trapping-rain-water',
        title: 'Trapping Rain Water',
        difficulty: 'hard',
        topics: ['two-pointers', 'dynamic-programming', 'stacks', 'arrays'],
        companies: ['Google', 'Meta', 'Amazon', 'Goldman Sachs', 'Apple'],
        description: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
        functionDescription: 'Calculate total units of trapped rain water using Two Pointers or Dynamic Programming.',
        inputFormat: 'JSON array of heights',
        outputFormat: 'Integer total trapped water',
        constraints: ['n == height.length', '1 <= n <= 2 * 10^4', '0 <= height[i] <= 10^5'],
        timeComplexityTarget: 'O(n)',
        spaceComplexityTarget: 'O(1)',
        starterCode: {
            javascript: `function trap(height) {\n    let left = 0, right = height.length - 1;\n    let leftMax = 0, rightMax = 0;\n    let trapped = 0;\n    while (left < right) {\n        if (height[left] < height[right]) {\n            if (height[left] >= leftMax) leftMax = height[left];\n            else trapped += leftMax - height[left];\n            left++;\n        } else {\n            if (height[right] >= rightMax) rightMax = height[right];\n            else trapped += rightMax - height[right];\n            right--;\n        }\n    }\n    return trapped;\n}`,
            python: `def trap(height):\n    left, right = 0, len(height) - 1\n    left_max, right_max = 0, 0\n    trapped = 0\n    while left < right:\n        if height[left] < height[right]:\n            if height[left] >= left_max:\n                left_max = height[left]\n            else:\n                trapped += left_max - height[left]\n            left += 1\n        else:\n            if height[right] >= right_max:\n                right_max = height[right]\n            else:\n                trapped += right_max - height[right]\n            right -= 1\n    return trapped`
        },
        sampleTestCases: [
            { input: '[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]', expectedOutput: '6', explanation: 'Trapped rain water between peaks = 6 units' },
            { input: '[4, 2, 0, 3, 2, 5]', expectedOutput: '9', explanation: 'Trapped rain water = 9 units' }
        ],
        testCases: [
            { input: '[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]', expectedOutput: '6' },
            { input: '[4, 2, 0, 3, 2, 5]', expectedOutput: '9' },
            { input: '[1, 2, 3, 4]', expectedOutput: '0' }
        ]
    },
    {
        id: 'merge-k-sorted-lists',
        title: 'Merge k Sorted Lists',
        difficulty: 'hard',
        topics: ['heaps', 'priority-queue', 'linked-lists', 'divide-and-conquer'],
        companies: ['Meta', 'Amazon', 'Google', 'Microsoft', 'Uber'],
        description: 'You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.',
        functionDescription: 'Merge k sorted arrays into a single combined sorted array.',
        inputFormat: 'JSON 2D array of sorted numbers',
        outputFormat: 'JSON single merged sorted array',
        constraints: ['k == lists.length', '0 <= k <= 10^4', '0 <= lists[i].length <= 500', '-10^4 <= lists[i][j] <= 10^4', 'lists[i] is sorted in ascending order.'],
        timeComplexityTarget: 'O(N log k)',
        spaceComplexityTarget: 'O(1) auxiliary or O(N) output',
        starterCode: {
            javascript: `function mergeKLists(lists) {\n    if (!lists || lists.length === 0) return [];\n    // Simple divide and conquer or flattened sort for runner verification\n    const flat = [];\n    for (const arr of lists) {\n        for (const num of arr) flat.push(num);\n    }\n    return flat.sort((a, b) => a - b);\n}`,
            python: `import heapq\n\ndef mergeKLists(lists):\n    # Flattened sort or min-heap\n    flat = [x for sub in lists for x in sub]\n    return sorted(flat)`
        },
        sampleTestCases: [
            { input: '[[1, 4, 5], [1, 3, 4], [2, 6]]', expectedOutput: '[1, 1, 2, 3, 4, 4, 5, 6]', explanation: 'Merged ascending list' },
            { input: '[]', expectedOutput: '[]', explanation: 'Empty input lists' }
        ],
        testCases: [
            { input: '[[1, 4, 5], [1, 3, 4], [2, 6]]', expectedOutput: '[1, 1, 2, 3, 4, 4, 5, 6]' },
            { input: '[]', expectedOutput: '[]' },
            { input: '[[], []]', expectedOutput: '[]' }
        ]
    }
];

/**
 * Scrapes or retrieves coding problems matching criteria with robust offline/mock fallback
 * @param {Object} options
 * @param {string} [options.companyName]
 * @param {string} [options.difficulty] - 'easy' | 'medium' | 'hard'
 * @param {string[]} [options.topics]
 * @returns {Promise<Array<Object>>}
 */
export async function scrapeCompanyCodingProblems(options = {}) {
    const targetDiff = (options.difficulty || 'medium').toLowerCase();
    const targetTopics = Array.isArray(options.topics)
        ? options.topics.map(t => String(t).toLowerCase().trim()).filter(Boolean)
        : [];
    const targetCompany = (options.companyName || '').toLowerCase().trim();

    // 1. Filter catalog by difficulty
    let candidates = CURATED_PROBLEM_CATALOG.filter(p => p.difficulty.toLowerCase() === targetDiff);
    if (candidates.length === 0) {
        candidates = CURATED_PROBLEM_CATALOG;
    }

    // 2. Score candidates by topic overlap and company match
    const scored = candidates.map(problem => {
        let score = 0;
        const pTopics = (problem.topics || []).map(t => t.toLowerCase());
        const pCompanies = (problem.companies || []).map(c => c.toLowerCase());

        // Topic matches
        for (const topic of targetTopics) {
            if (pTopics.includes(topic) || pTopics.some(t => t.includes(topic) || topic.includes(t))) {
                score += 3;
            }
        }

        // Company affiliation match
        if (targetCompany && pCompanies.some(c => c.includes(targetCompany) || targetCompany.includes(c))) {
            score += 2;
        }

        return { problem, score };
    });

    // Sort descending by relevance score
    scored.sort((a, b) => b.score - a.score);

    const result = scored.map(s => s.problem);
    return result.length > 0 ? result : candidates;
}

/**
 * Selects an adaptive coding problem based on candidateProfile CRI/signal and companyIntel
 * @param {Object} candidateProfile 
 * @param {Object} companyIntel 
 * @returns {Promise<Object>} selected problem
 */
export async function selectCodingProblem(candidateProfile = {}, companyIntel = {}) {
    const signal = candidateProfile.overallSignal || 'adequate';
    const difficultyMap = {
        strong: 'hard',
        adequate: 'medium',
        weak: 'easy'
    };
    const difficulty = difficultyMap[signal] || 'medium';

    const weakTopics = Array.isArray(candidateProfile.weakTopics) ? candidateProfile.weakTopics : [];
    const focusAreas = Array.isArray(companyIntel.focusAreas)
        ? companyIntel.focusAreas
        : (Array.isArray(companyIntel.topFocusAreas) ? companyIntel.topFocusAreas : []);
    
    const combinedTopics = weakTopics.concat(focusAreas);

    const problems = await scrapeCompanyCodingProblems({
        companyName: companyIntel.companyName || companyIntel.name || '',
        difficulty,
        topics: combinedTopics
    });

    // Pick top relevance or pick from top 3 with slight randomness for freshness
    const poolSize = Math.min(3, problems.length);
    const selected = problems[Math.floor(Math.random() * poolSize)] || problems[0] || CURATED_PROBLEM_CATALOG[0];

    return {
        ...selected,
        // Ensure standard schema compatibility for interview session
        starterCode: typeof selected.starterCode === 'object'
            ? (selected.starterCode.javascript || selected.starterCode.python || '')
            : selected.starterCode,
        starterCodeByLanguage: typeof selected.starterCode === 'object' ? selected.starterCode : { javascript: selected.starterCode }
    };
}

export default {
    CURATED_PROBLEM_CATALOG,
    scrapeCompanyCodingProblems,
    selectCodingProblem
};

