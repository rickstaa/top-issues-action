/**
 * @file Contains action helper functions.
 */
import {getInput, InputOptions, setFailed} from '@actions/core'
import {context} from '@actions/github'
import {RequestError} from '@octokit/request-error'
import type {IssueNode, TopIssueNode} from './types'
import {octokit} from './utils'

export type GithubContext = typeof context

// == Types ==

/**
 * Repository info.
 */
interface RepoInfo {
  owner: string
  repo: string
}

/**
 * Open issues object returned by GraphQL.
 */
interface OpenIssues {
  nodes: IssueNode[]
  pageInfo: {endCursor: string; hasNextPage: boolean}
}

/**
 * Issues response object returned by GraphQL.
 */
interface IssuesResponse {
  repository: {
    open_issues: OpenIssues
  }
}

/**
 * PR object returned by GraphQL.
 */
interface PRNode {
  number: number
  title: string
  positive: {totalCount: number}
  negative: {totalCount: number}
  labels: {nodes: {name: string}[]}
}

/**
 * Open PRs object returned by GraphQL.
 */
interface OpenPRs {
  nodes: PRNode[]
  pageInfo: {endCursor: string; hasNextPage: boolean}
}

/**
 * PR response object returned by GraphQL.
 */
interface PRsResponse {
  repository: {
    open_prs: OpenPRs
  }
}

// == Methods ==

/**
 * Gets the values of an multiline input.  Each value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string[]
 *
 */
// TODO: Can be replaced with core.getMultilineInput when https://github.com/actions/toolkit/pull/1183 is released.
export function getMultilineInput(
  name: string,
  options?: InputOptions
): string[] {
  const inputs: string[] = getInput(name, options)
    .split(/[[\]\n,]+/)
    .map(s => s.trim())
    .filter(x => x !== '')

  return inputs
}

/**
 * Convert array to human readable comma separated string.
 * @param arr Input array.
 * @returns Human readable comma separated string.
 */
export const array2str = (arr: string[]): string => {
  if (arr.length === 0) {
    return ''
  } else if (arr.length === 1) {
    return arr[0]
  }
  return `${arr.slice(0, arr.length - 1).join(', ')} and ${arr[arr.length - 1]}`
}

/**
 * Retrieve information about the repository that ran the action.
 * @param context Action context.
 * @returns Repository information.
 */
export const getRepoInfo = (ctx: GithubContext): RepoInfo => {
  try {
    return {
      owner: ctx.repo.owner,
      repo: ctx.repo.repo
    }
  } catch (error) {
    if (error instanceof RequestError) {
      setFailed(
        `Repository and user information could not be retrieved: ${error.message}`
      )
    }
    throw error
  }
}

/**
 * Fetch open issues from a given repository.
 * @param user The user name of the repository owner.
 * @param repo The name of the repository.
 * @returns The open issues.
 */
export const fetchOpenIssues = async (
  user: string,
  repo: string
): Promise<IssueNode[]> => {
  const openIssues: IssueNode[] = []
  let hasNextPage = true
  let endCursor: string | undefined
  while (hasNextPage) {
    try {
      const {repository} = await octokit.graphql<IssuesResponse>(
        `
            {
              repository(owner: "${user}", name: "${repo}") {
                open_issues: issues(${
                  endCursor ? `after: "${endCursor}", ` : ''
                }
                  first: 100, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
                  nodes {
                    number
                    title
                    positive: reactions(content: THUMBS_UP) {
                      totalCount
                    }
                    negative: reactions(content: THUMBS_DOWN) {
                      totalCount
                    }
                    labels(first: 100, orderBy:{field: CREATED_AT, direction: DESC}) {
                      nodes {
                        name
                      }
                    }
                  }
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                }
              }
            }
          `
      )
      openIssues.push(...repository.open_issues.nodes)
      hasNextPage = repository.open_issues.pageInfo.hasNextPage
      endCursor = repository.open_issues.pageInfo.endCursor
    } catch (error) {
      if (error instanceof RequestError) {
        setFailed(
          `Could not retrieve top issues using GraphQl: ${error.message}`
        )
      }
      throw error
    }
  }
  return openIssues
}

/**
 * Fetch open PRs from a given repository.
 * @param user The user name of the repository owner.
 * @param repo The name of the repository.
 * @returns The open PRs.
 */
export const fetchOpenPRs = async (
  user: string,
  repo: string
): Promise<PRNode[]> => {
  const openPRs: PRNode[] = []
  let hasNextPage = true
  let endCursor: string | undefined
  while (hasNextPage) {
    try {
      const {repository} = await octokit.graphql<PRsResponse>(
        `
        {
          repository(owner: "${user}", name: "${repo}") {
            open_prs: pullRequests(${endCursor ? `after: "${endCursor}", ` : ''}
              first: 100, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                number
                title
                positive: reactions(content: THUMBS_UP) {
                  totalCount
                }
                negative: reactions(content: THUMBS_DOWN) {
                  totalCount
                }
                labels(first: 100, orderBy:{field: CREATED_AT, direction: DESC}) {
                  nodes {
                    name
                  }
                }
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }
        }
      `
      )
      openPRs.push(...repository.open_prs.nodes)
      hasNextPage = repository.open_prs.pageInfo.hasNextPage
      endCursor = repository.open_prs.pageInfo.endCursor
    } catch (error) {
      if (error instanceof RequestError) {
        setFailed(`Could not retrieve top PRs using GraphQl: ${error.message}`)
      }
      throw error
    }
  }
  return openPRs
}

/**
 * Retrieve issues that have a given label.
 * @param issues The issues to check.
 * @param label The label to check for.
 */
export const issuesWithLabel = (
  issues: IssueNode[],
  label: string
): IssueNode[] => {
  return issues.filter((issue: IssueNode) => {
    return issue.labels.nodes.some(lab => lab.name === label)
  })
}

/**
 * Get the total number of reactions for a given issue.
 * @param issue The issue to check.
 * @param subtractNegative Whether to subtract negative reactions from the total count.
 * @returns The total number of reactions.
 */
export const getReactionsCount = (
  issue: IssueNode,
  subtractNegative: boolean
): number => {
  return subtractNegative
    ? issue.positive.totalCount - issue.negative.totalCount
    : issue.positive.totalCount
}

/**
 * Add totalReactions property to list of issues.
 * @param issues Issues to add the property to.
 * @param subtractNegative Whether to subtract negative reactions from the total count.
 * @returns List of issues with totalReactions property.
 */
export const addTotalReactions = (
  issues: IssueNode[],
  subtractNegative: boolean
): TopIssueNode[] => {
  const issueNodeWithTotalReactions: TopIssueNode[] = []
  for (const issue of issues) {
    issueNodeWithTotalReactions.push({
      ...issue,
      totalReactions: getReactionsCount(issue, subtractNegative)
    })
  }
  return issueNodeWithTotalReactions
}

/**
 * Get the top issues.
 * @param issues Issues object to get the top issues from.
 * @param size Number of issues to get.
 * @param subtractNegative Whether to subtract negative reactions from the total count.
 * @param dashboardLabel The label used for the top issues dashboard.
 * @returns Top issues.
 */
export const getTopIssues = (
  issues: IssueNode[],
  size: number,
  subtractNegative: boolean,
  dashboardLabel: string,
  filter?: number[]
): TopIssueNode[] => {
  let topIssues: TopIssueNode[] = addTotalReactions(issues, subtractNegative)
  topIssues = topIssues.filter(
    issue =>
      issue.labels.nodes.length === 0 ||
      issue.labels.nodes.some(lab => lab.name !== dashboardLabel)
  ) // Remove top issues dashboard issue
  if (filter && filter.length > 0) {
    topIssues = topIssues.filter(issue => !filter.includes(issue.number))
  } // Filter issues
  topIssues = topIssues.filter(issue => issue.totalReactions > 0) // Remove issues with no reactions
  topIssues = topIssues.sort((a: TopIssueNode, b: TopIssueNode) => {
    return b.totalReactions - a.totalReactions
  })
  return topIssues.slice(0, size)
}

/**
 * Make sure that a label exists with the correct colour and description.
 * @param owner The owner of the repository.
 * @param repo The name of the repository.
 * @param label The label to check.
 * @param labelDescription The description of the label.
 * @param labelColour The colour of the label.
 */
export const initLabel = async (
  owner: string,
  repo: string,
  label: string,
  labelColour: string,
  labelDescription: string
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const currentLabels = await octokit.rest.issues.listLabelsForRepo({
        owner,
        repo
      })
      const currentLabel = currentLabels.data.find(
        ({name: labelName}) => labelName === label
      )

      // Create label if it doesn't exist and update it if it does.
      const topIssueLabelColourBare = labelColour.replace('#', '')
      if (!currentLabel) {
        await octokit.rest.issues.createLabel({
          owner,
          repo,
          name: label,
          color: topIssueLabelColourBare,
          description: labelDescription
        })
      } else {
        if (
          currentLabel.description !== labelDescription ||
          currentLabel.color !== topIssueLabelColourBare
        ) {
          await octokit.rest.issues.updateLabel({
            owner,
            repo,
            name: label,
            color: topIssueLabelColourBare,
            description: labelDescription
          })
        }
      }
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Add a label to an issue.
 * @param owner The owner of the repository.
 * @param repo The name of the repository.
 * @param issue The issue to add the label to.
 * @param label The label to add.
 * @returns
 */
const addLabelToIssue = async (
  owner: string,
  repo: string,
  issue: IssueNode,
  label: string
): Promise<void> => {
  if (!issue.labels.nodes.some(lab => lab.name === label)) {
    try {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: issue.number,
        labels: [label]
      })
    } catch (error) {
      if (error instanceof RequestError) {
        setFailed(
          `Could not add label '${label}' to issue '${issue.number}': ${error.message}`
        )
      }
      throw error
    }
  }
}

/**
 * Add a label to a list of issues.
 * @param owner The owner of the repository.
 * @param repo The name of the repository.
 * @param issues The issues to add the label to.
 * @param label The label to add.
 * @returns
 */
const labelIssues = (
  owner: string,
  repo: string,
  issues: IssueNode[],
  label: string
): void => {
  for (const issue of issues) {
    addLabelToIssue(owner, repo, issue, label)
  }
}

/**
 * Get the objects that are in the first but not in the second issue list.
 * @param issuesOne First list of issues.
 * @param issuesTwo Second list of issues.
 * @returns The difference between the two lists.
 */
export const getIssuesDifference = (
  issuesOne: IssueNode[],
  issuesTwo: IssueNode[]
): IssueNode[] => {
  if (issuesOne.length === 0) {
    return issuesTwo
  } else if (issuesTwo.length === 0) {
    return issuesOne
  } else {
    return issuesOne.filter(
      ({number: id1}) => !issuesTwo.some(({number: id2}) => id1 === id2)
    )
  }
}

/**
 * Remove a label from an issue.
 * @param owner The owner of the repository.
 * @param repo The name of the repository.
 * @param issue The issue to add the label to.
 * @param label The label to add.
 * @returns
 */
const removeLabelFromIssue = (
  owner: string,
  repo: string,
  issue: IssueNode,
  label: string
): void => {
  if (issue.labels.nodes.some(lab => lab.name === label)) {
    try {
      octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: issue.number,
        name: label
      })
    } catch (error) {
      if (error instanceof RequestError) {
        setFailed(
          `Could not remove label '${label}' from issue '${issue.number}': ${error.message}`
        )
      }
      throw error
    }
  }
}

/**
 * Remove a label from a list of issues.
 * @param owner The owner of the repository.
 * @param repo The name of the repository.
 * @param issues The issues to add the label to.
 * @param label The label to add.
 * @returns
 */
const removeLabelFromIssues = (
  owner: string,
  repo: string,
  issues: IssueNode[],
  label: string
): void => {
  for (const issue of issues) {
    removeLabelFromIssue(owner, repo, issue, label)
  }
}

/**
 * Label the top issues.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param currentTopIssues Current top issues.
 * @param newTopIssues New top issues.
 * @param topIssueLabel Label to add to the top issues.
 * @param topIssueLabelDescription Description of the top issues label.
 * @param topIssueLabelColour Colour of the top issues label.
 */
export const labelTopIssues = async (
  owner: string,
  repo: string,
  currentTopIssues: IssueNode[],
  newTopIssues: IssueNode[],
  topIssueLabel: string,
  topIssueLabelDescription: string,
  topIssueLabelColour: string
): Promise<void> => {
  try {
    await initLabel(
      owner,
      repo,
      topIssueLabel,
      topIssueLabelColour,
      topIssueLabelDescription
    )
  } catch (error) {
    if (error instanceof RequestError) {
      setFailed(
        `Something went wrong while initializing the issue '${topIssueLabel}' label: ${error.message}`
      )
    }
    throw error
  }
  labelIssues(owner, repo, newTopIssues, topIssueLabel)
  const topIssuesToPrune = getIssuesDifference(currentTopIssues, newTopIssues)
  removeLabelFromIssues(owner, repo, topIssuesToPrune, topIssueLabel)
}

/**
 * Create the top issues dashboard markdown.
 * @param topIssues Top issues.
 * @param topBugs Top bugs.
 * @param topFeatures Top features.
 * @param newTopPRs Top pull requests.
 * @param newTopCustom Top custom.
 * @param newTopCustomLabel Top custom label.
 * @param newTopCustom Top custom PRs.
 * @param newTopCustomLabel Top custom PRs label.
 * @param header Header of the dashboard.
 * @param footer Footer of the dashboard.
 * @param showTotalReactions Whether to show the total number of positive reactions after each dashboard item.
 * @returns
 */
export const createDashboardMarkdown = (
  topIssues: TopIssueNode[],
  topBugs: TopIssueNode[],
  topFeatures: TopIssueNode[],
  topPRs: TopIssueNode[],
  topCustom: TopIssueNode[],
  topCustomLabel: string,
  topCustomPRs: TopIssueNode[],
  topCustomPRsLabel: string,
  header: string,
  footer: string,
  showTotalReactions: boolean
): string => {
  let dashboard_body = `${header}`
  let dashboard_issues_body = ``
  if (topIssues.length > 0) {
    dashboard_issues_body += `\n\n## Top issues\n`
    dashboard_issues_body += `\n${topIssues
      .map((issue, idx) =>
        showTotalReactions
          ? `${idx + 1}. #${issue.number} :+1:\`${issue.totalReactions}\``
          : `${idx + 1}. #${issue.number}`
      )
      .join('\n')}`
  }
  if (topBugs.length > 0) {
    dashboard_issues_body += `\n\n## Top bugs\n`
    dashboard_issues_body += `\n${topBugs
      .map((bug, idx) =>
        showTotalReactions
          ? `${idx + 1}. #${bug.number} :+1:\`${bug.totalReactions}\``
          : `${idx + 1}. #${bug.number}`
      )
      .join('\n')}`
  }
  if (topFeatures.length > 0) {
    dashboard_issues_body += `\n\n## Top feature requests\n`
    dashboard_issues_body += `\n${topFeatures
      .map((feature, idx) =>
        showTotalReactions
          ? `${idx + 1}. #${feature.number} :+1:\`${feature.totalReactions}\``
          : `${idx + 1}. #${feature.number}`
      )
      .join('\n')}`
  }
  if (topPRs.length > 0) {
    dashboard_issues_body += `\n\n## Top PRs\n`
    dashboard_issues_body += `\n${topPRs
      .map((PR, idx) =>
        showTotalReactions
          ? `${idx + 1}. #${PR.number} :+1:\`${PR.totalReactions}\``
          : `${idx + 1}. #${PR.number}`
      )
      .join('\n')}`
  }
  if (topCustom.length > 0) {
    dashboard_issues_body += `\n\n## Top '${topCustomLabel}' issues\n`
    dashboard_issues_body += `\n${topCustom
      .map((issue, idx) =>
        showTotalReactions
          ? `${idx + 1}. #${issue.number} :+1:\`${issue.totalReactions}\``
          : `${idx + 1}. #${issue.number}`
      )
      .join('\n')}`
  }
  if (topCustomPRs.length > 0) {
    dashboard_issues_body += `\n\n## Top '${topCustomPRsLabel}' pull requests\n`
    dashboard_issues_body += `\n${topCustomPRs
      .map((issue, idx) =>
        showTotalReactions
          ? `${idx + 1}. #${issue.number} :+1:\`${issue.totalReactions}\``
          : `${idx + 1}. #${issue.number}`
      )
      .join('\n')}`
  }
  if (dashboard_issues_body) {
    dashboard_body += `${dashboard_issues_body}`
  } else {
    dashboard_body += `\n\n## Top issues\n\n> Could not find any top issues :zzz:.`
  }
  if (footer) dashboard_body += `\n\n${footer}`
  return dashboard_body
}

/**
 * Create the top issues dashboard.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param issues List off issues found in the repository.
 * @param dashboard_body The dashboard body.
 * @param title The title of the dashboard.
 * @param label The label of the dashboard.
 * @param labelColour The colour of the dashboard label.
 * @param labelDescription The description of the dashboard label.
 */
export const createDashboard = async (
  owner: string,
  repo: string,
  issues: IssueNode[],
  dashboard_body: string,
  title: string,
  label: string,
  labelColour: string,
  labelDescription: string
): Promise<void> => {
  try {
    await initLabel(owner, repo, label, labelColour, labelDescription)
  } catch (error) {
    if (error instanceof RequestError) {
      setFailed(
        `Something went wrong while initializing the dashboard '${label}' label: ${error.message}`
      )
    }
    throw error
  }
  let dashboardIssue = issuesWithLabel(issues, label)
  if (dashboardIssue.length === 0) {
    dashboardIssue = issues.filter(issue => issue.title === title)
  }
  if (dashboardIssue.length > 0) {
    try {
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: dashboardIssue[0].number,
        title,
        body: dashboard_body,
        labels: [label]
      })
    } catch (error) {
      if (error instanceof RequestError) {
        setFailed(
          `Could not update issue '${dashboardIssue[0].number}': ${error.message}`
        )
      }
      throw error
    }
  } else {
    try {
      await octokit.rest.issues.create({
        owner,
        repo,
        title,
        body: dashboard_body,
        labels: [label]
      })
    } catch (error) {
      if (error instanceof RequestError) {
        setFailed(`Could not create issue '${title}': ${error.message}`)
      }
      throw error
    }
  }
}
