/**
 * @file Helper functions test file.
 *
 * @remark This file does not test functions that wrap external calls to the GitHub client.
 */
import {DASHBOARD_FOOTER, DASHBOARD_HEADER} from '../src/constants'
import {
  addTotalReactions,
  array2str,
  createDashboardMarkdown,
  getIssuesDifference,
  getMultilineInput,
  getReactionsCount,
  getRepoInfo,
  getTopIssues,
  GithubContext,
  issuesWithLabel
} from '../src/helpers'
import {IssueNode} from '../src/types'

// == Mock functions ==
jest.mock('@actions/github')
// jest.mock('@actions/core')

// == Helper functions ==

/**
 * Removes the timestamp from the dashboard.
 * @param str The dashboard markdown body.
 * @returns The dashboard markdown body without the timestamp.
 */
const removeDashboardTimeStamp = (str: string): string => {
  return str.replace(/\s*\(last update: [\/0-9]*, [:0-9]*.*[PAM]*\)/, '')
}

// == Test Objects ==

// A dummy issues object.
const dummyIssues = [
  {
    number: 1,
    title: 'Title 1',
    positive: {totalCount: 2},
    negative: {totalCount: 0},
    labels: {nodes: [{name: 'a-label'}]}
  },
  {
    number: 2,
    title: 'Title 2',
    positive: {totalCount: 3},
    negative: {totalCount: 5},
    labels: {nodes: [{name: 'another-label'}]}
  },
  {
    number: 3,
    title: 'Title 3',
    positive: {totalCount: 5},
    negative: {totalCount: 1},
    labels: {nodes: [{name: 'another-label'}]}
  },
  {
    number: 4,
    title: 'Title 4',
    positive: {totalCount: 0},
    negative: {totalCount: 0},
    labels: {nodes: [{name: 'another-label2'}]}
  },
  {
    number: 5,
    title: 'Title 5',
    positive: {totalCount: 1},
    negative: {totalCount: 0},
    labels: {nodes: [{name: 'another-label3'}]}
  }
] as IssueNode[]

// Dummy issues with totalReactions property
const dummyTopIssues = dummyIssues.map(issue => ({
  ...issue,
  totalReactions: getReactionsCount(issue, false)
}))

// Dummy issues with totalReactions property in which negative reactions are
// subtracted from the total.
const dummyTopIssuesNegativeSubtract = dummyIssues.map(issue => ({
  ...issue,
  totalReactions: getReactionsCount(issue, true)
}))

// Another dummy issues object.
const differentDummyIssues = [
  {
    number: 10,
    title: 'Title 10',
    positive: {totalCount: 2},
    negative: {totalCount: 0},
    labels: {nodes: [{name: 'a-label'}]}
  },
  ...dummyIssues.slice(0, 3),
  {
    number: 6,
    title: 'Title 6',
    positive: {totalCount: 5},
    negative: {totalCount: 0},
    labels: {nodes: [{name: 'another-label3'}]}
  }
]

// Dashboard result when no issues are found.
const noIssuesDashboard = `<!--
This dashboard was generated by the [top-issues-action](https://github.com/rickstaa/top-issues-action) action.
-->

A simple dashboard that lists the top issues/bugs/features and pull requests.

## Top issues

> Could not find any top issues :zzz:.

> Created by the [rickstaa/top-issues-action](https://github.com/rickstaa/top-issues-action) action (last update: 26/07/2022, 11:55:40).`

const noIssuesNoFooterDashboard = `<!--
This dashboard was generated by the [top-issues-action](https://github.com/rickstaa/top-issues-action) action.
-->

A simple dashboard that lists the top issues/bugs/features and pull requests.

## Top issues

> Could not find any top issues :zzz:.`

const fullIssuesDashboard = `<!--
This dashboard was generated by the [top-issues-action](https://github.com/rickstaa/top-issues-action) action.
-->

A simple dashboard that lists the top issues/bugs/features and pull requests.

## Top issues <a href="#top-issues" id="top-issues"/>

1. #3
2. #1

## Top bugs <a href="#top-bugs" id="top-bugs"/>

1. #1

## Top feature requests <a href="#top-feature-requests" id="top-feature-requests"/>

1. #1
2. #5

## Top PRs <a href="#top-prs" id="top-prs"/>

1. #5

## Top 'ci' issues <a href="#top-ci" id="top-ci"/>

1. #5

## Top 'themes' pull requests <a href="#top-themes-prs" id="top-themes-prs"/>

1. #1
2. #5

> Created by the [rickstaa/top-issues-action](https://github.com/rickstaa/top-issues-action) action (last update: 10/08/2022, 12:25:50).`

const fullIssuesReactionCountDashboard = `<!--
This dashboard was generated by the [top-issues-action](https://github.com/rickstaa/top-issues-action) action.
-->

A simple dashboard that lists the top issues/bugs/features and pull requests.

## Top issues <a href="#top-issues" id="top-issues"/>

1. #3 :+1:\`4\`
2. #1 :+1:\`2\`

## Top bugs <a href="#top-bugs" id="top-bugs"/>

1. #1 :+1:\`2\`

## Top feature requests <a href="#top-feature-requests" id="top-feature-requests"/>

1. #1 :+1:\`2\`
2. #5 :+1:\`1\`

## Top PRs <a href="#top-prs" id="top-prs"/>

1. #5 :+1:\`1\`

## Top 'ci' issues <a href="#top-ci" id="top-ci"/>

1. #5 :+1:\`1\`

## Top 'themes' pull requests <a href="#top-themes-prs" id="top-themes-prs"/>

1. #1 :+1:\`2\`
2. #5 :+1:\`1\`

> Created by the [rickstaa/top-issues-action](https://github.com/rickstaa/top-issues-action) action (last update: 10/08/2022, 12:27:08).`

// Environment variables.
const testEnvVars = {
  INPUT_MY_INPUT_LIST: 'val1\nval2\nval3',
  INPUT_MY_INPUT_LIST_2: 'val1,val2,val3',
  INPUT_MY_INPUT_LIST_3: '[val1,val2,val3]',
  INPUT_MY_INPUT_LIST_4: '[val1, val2, val3]'
}

// == Tests ==
describe('getMultiLineInput', () => {
  beforeEach(() => {
    for (const key in testEnvVars) {
      process.env[key] = testEnvVars[key as keyof typeof testEnvVars]
    }
  })

  it('getMultilineInput works', () => {
    expect(getMultilineInput('my input list')).toEqual(['val1', 'val2', 'val3'])

    expect(getMultilineInput('my input list 2')).toEqual([
      'val1',
      'val2',
      'val3'
    ])

    expect(getMultilineInput('my input list 3')).toEqual([
      'val1',
      'val2',
      'val3'
    ])
  })
})

describe('array2str', () => {
  it('should return empty string for empty array', () => {
    expect(array2str([])).toBe('')
  })

  it('should return single string if array contains one item', () => {
    expect(array2str(['a'])).toBe('a')
  })

  it('should return string with comma separated values', () => {
    expect(array2str(['a', 'b', 'c'])).toBe('a, b and c')
  })
})

describe('getRepoInfo', () => {
  it('should return the issue info', async () => {
    const repoInfoMock = {owner: 'owner', repo: 'repo'}
    const ctx = {
      repo: {...repoInfoMock}
    } as unknown as GithubContext
    const repoInfo = getRepoInfo(ctx)
    expect(repoInfo).toStrictEqual(repoInfoMock)
  })
})

describe('issuesWithLabel', () => {
  it('should return an empty array if no issues are found', () => {
    const issues = [] as IssueNode[]
    const label = 'label'
    const result = issuesWithLabel(issues, label)
    expect(result).toEqual([])
  })

  it('should return an empty array if no issues have the label', () => {
    const label = 'label'
    const result = issuesWithLabel(dummyIssues, label)
    expect(result).toEqual([])
  })

  it('should return an array of issues with the label "another-label"', () => {
    const label = 'another-label'
    const result = issuesWithLabel(dummyIssues, label)
    expect(result).toEqual(dummyIssues.slice(1, 3))
  })
})

describe('getReactionsCount', () => {
  it("should return the correct total number of reactions when 'subtractNegative' is `false`", () => {
    const issue = dummyIssues[1]
    const result = getReactionsCount(issue, false)
    expect(result).toEqual(3)
  })

  it("should return the correct total number of reactions when 'subtractNegative' is `true`", () => {
    const issue = dummyIssues[1]
    const result = getReactionsCount(issue, true)
    expect(result).toEqual(-2)
  })
})

describe('addTotalReactions', () => {
  it('should add the totalReactions property to the issues', () => {
    const issues = dummyIssues
    const result = addTotalReactions(issues, false)
    expect(result).toEqual(dummyTopIssues)
  })
})

describe('getTopIssues', () => {
  it('should return an empty array if no issues are found', () => {
    const issues = [] as IssueNode[]
    const result = getTopIssues(issues, 3, true, '')
    expect(result).toEqual([])
  })

  it("should return an array length 2 when 'size' is set to `2`", () => {
    const result = getTopIssues(dummyIssues, 2, true, '')
    expect(result).toHaveLength(2)
  })

  it("should return the correct top issues when 'subtractNegative' is set to `false`", () => {
    const result = getTopIssues(dummyIssues, 10, false, '')
    expect(result).toEqual([
      dummyTopIssues[2],
      dummyTopIssues[1],
      dummyTopIssues[0],
      dummyTopIssues[4]
    ])
  })

  it("should return the correct top issues when 'subtractNegative' is set to `true`", () => {
    const result = getTopIssues(dummyIssues, 10, true, '')
    expect(result).toEqual([
      dummyTopIssuesNegativeSubtract[2],
      dummyTopIssuesNegativeSubtract[0],
      dummyTopIssuesNegativeSubtract[4]
    ])
  })
})

describe('getIssuesDifference', () => {
  it('should return an empty array if no issues are supplied', () => {
    const result = getIssuesDifference([], [])
    expect(result).toEqual([])
  })

  it('should return the first issues object if the second issues object is empty', () => {
    const result = getIssuesDifference(dummyIssues, [])
    expect(result).toEqual(dummyIssues)
  })

  it('should return the second issues object if the first issues object is empty', () => {
    const result = getIssuesDifference([], dummyIssues)
    expect(result).toEqual(dummyIssues)
  })

  it('should return the second issues object if the first issues object is empty', () => {
    const result = getIssuesDifference([], dummyIssues)
    expect(result).toEqual(dummyIssues)
  })

  it('should return the correct difference between two issues objects', () => {
    const currentTopIssues = differentDummyIssues
    const newTopIssues = dummyIssues
    const result = getIssuesDifference(currentTopIssues, newTopIssues)
    expect(result).toEqual([currentTopIssues[0], currentTopIssues.slice(-1)[0]])
  })
})

describe('createDashboardMarkdown', () => {
  it('should return the no issues dashboard if no issues are supplied', () => {
    const result = createDashboardMarkdown(
      [],
      [],
      [],
      [],
      [],
      '',
      [],
      '',
      DASHBOARD_HEADER,
      DASHBOARD_FOOTER,
      false
    )
    expect(removeDashboardTimeStamp(result)).toMatch(
      removeDashboardTimeStamp(noIssuesDashboard)
    )
  })

  it('should not display the footer if the footer is disabled', () => {
    const result = createDashboardMarkdown(
      [],
      [],
      [],
      [],
      [],
      '',
      [],
      '',
      DASHBOARD_HEADER,
      '',
      false
    )
    expect(removeDashboardTimeStamp(result)).toMatch(
      removeDashboardTimeStamp(noIssuesNoFooterDashboard)
    )
  })

  it('should return the correct dashboard when top issues are found', () => {
    const topDummyIssues = getTopIssues(dummyIssues, 10, true, '')
    const result = createDashboardMarkdown(
      topDummyIssues.slice(0, 2),
      topDummyIssues.slice(1, 2),
      topDummyIssues.slice(1, 3),
      topDummyIssues.slice(2, 3),
      topDummyIssues.slice(2, 3),
      'ci',
      topDummyIssues.slice(1, 3),
      'themes',
      DASHBOARD_HEADER,
      DASHBOARD_FOOTER,
      false
    )
    expect(removeDashboardTimeStamp(result)).toMatch(
      removeDashboardTimeStamp(fullIssuesDashboard)
    )
  })

  it("should return dashboard with total emotions count when 'showTotalReactions' is `true`", () => {
    const topDummyIssues = getTopIssues(dummyIssues, 10, true, '')
    const result = createDashboardMarkdown(
      topDummyIssues.slice(0, 2),
      topDummyIssues.slice(1, 2),
      topDummyIssues.slice(1, 3),
      topDummyIssues.slice(2, 3),
      topDummyIssues.slice(2, 3),
      'ci',
      topDummyIssues.slice(1, 3),
      'themes',
      DASHBOARD_HEADER,
      DASHBOARD_FOOTER,
      true
    )
    expect(removeDashboardTimeStamp(result)).toMatch(
      removeDashboardTimeStamp(fullIssuesReactionCountDashboard)
    )
  })
})
