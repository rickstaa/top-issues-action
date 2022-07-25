/**
 * @file Contains action helper functions.
 */
import {getInput} from '@actions/core'
import {context} from '@actions/github'
import {RequestError} from '@octokit/request-error'
import {octokit} from './main'
import type {IssueNode} from './types'

type GithubContext = typeof context

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
 * Retrieves a action string input while handling the case where the input is not set.
 * @param name The name of the input.
 * @param defaultValue The default value of the input.
 * @returns
 */
export const getStringInput = (name: string, defaultValue: string): string => {
  return getInput(name) ? getInput(name) : defaultValue
}

/**
 * Retrieves a action integer input while handling the case where the input is not set.
 * @param name The name of the input.
 * @param defaultValue The default value of the input.
 * @returns
 */
export const getIntegerInput = (name: string, defaultValue: number): number => {
  return getInput(name) ? parseInt(getInput(name)) : defaultValue
}

/**
 * Retrieves a action boolean input while handling the case where the input is not set.
 * @param name The name of the input.
 * @param defaultValue The default value of the input.
 * @returns
 */
export const getBooleanInput = (
  name: string,
  defaultValue: boolean
): boolean => {
  return getInput(name) ? Boolean(getInput(name)) : defaultValue
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
    // TODO: Change to action error.
    if (error instanceof Error) {
      throw Error(
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
  try {
    const {repository} = await octokit.graphql<IssuesResponse>(
      `
          {
            repository(owner: "${user}", name: "${repo}") {
              open_issues: issues(first: 100, states: OPEN) {
                nodes {
                  number
                  title
                  positive: reactions(content: THUMBS_UP) {
                    totalCount
                  }
                  negative: reactions(content: THUMBS_DOWN) {
                    totalCount
                  }
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                  body
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
    return repository.open_issues.nodes
  } catch (error) {
    if (error instanceof RequestError) {
      // TODO: Replace by github action error.
      throw Error(
        `Could not retrieve top issues using GraphQl: ${error.message}.`
      )
    }
    throw error
  }
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
  try {
    const {repository} = await octokit.graphql<PRsResponse>(
      `
        {
          repository(owner: "${user}", name: "${repo}") {
            open_prs: pullRequests(first: 100, states: OPEN){
              nodes {
                number
                title
                positive: reactions(content: THUMBS_UP) {
                  totalCount
                }
                negative: reactions(content: THUMBS_DOWN) {
                  totalCount
                }
                labels(first: 10) {
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
    return repository.open_prs.nodes
  } catch (error) {
    if (error instanceof RequestError) {
      throw Error(`Could not retrieve top PRs using GraphQl: ${error.message}.`)
    }
    throw error
  }
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
 * Get the top issues.
 * @param issues Issues object to get the top issues from.
 * @param size Number of issues to get.
 * @param subtractNegative Whether to subtract negative reactions from the total count.
 * @returns Top issues.
 */
export const getTopIssues = (
  issues: IssueNode[],
  size: number,
  subtractNegative: boolean
): IssueNode[] => {
  issues = issues.filter(issue =>
    subtractNegative
      ? issue.positive.totalCount - issue.negative.totalCount
      : issue.positive.totalCount > 0
  ) // Remove issues with no reactions
  issues = issues.sort((a: IssueNode, b: IssueNode) => {
    return subtractNegative
      ? b.positive.totalCount -
          b.negative.totalCount -
          (a.positive.totalCount - a.negative.totalCount)
      : b.positive.totalCount - a.positive.totalCount
  })
  return issues.slice(0, size)
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
            color: labelColour,
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
const addLabelToIssue = (
  owner: string,
  repo: string,
  issue: IssueNode,
  label: string
): void => {
  if (!issue.labels.nodes.some(lab => lab.name === label)) {
    octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issue.number,
      labels: [label]
    })
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
 * Get the difference between to lists of issues.
 * @param issuesOne First list of issues.
 * @param issuesTwo Second list of issues.
 * @returns The difference between the two lists.
 */
const getIssuesDifference = (
  issuesOne: IssueNode[],
  issuesTwo: IssueNode[]
): IssueNode[] => {
  return issuesOne.filter(
    ({number: id1}) => !issuesTwo.some(({number: id2}) => id2 === id1)
  )
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
    octokit.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: issue.number,
      name: label
    })
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
  await initLabel(
    owner,
    repo,
    topIssueLabel,
    topIssueLabelColour,
    topIssueLabelDescription
  )
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
 * @param header Header of the dashboard.
 * @param footer Footer of the dashboard.
 * @returns
 */
export const createDashboardMarkdown = (
  topIssues: IssueNode[],
  topBugs: IssueNode[],
  topFeatures: IssueNode[],
  topPRs: IssueNode[],
  header: string,
  footer: string
): string => {
  let dashboard_body = `${header}`
  if (topIssues.length > 0) {
    dashboard_body += `\n\n## Top issues\n`
    dashboard_body += `\n${topIssues
      .map((issue, idx) => `${idx + 1}. #${issue.number}`)
      .join('\n')}`
  }
  if (topBugs.length > 0) {
    dashboard_body += `\n\n## Top bugs\n`
    dashboard_body += `\n${topBugs
      .map((bug, idx) => `${idx + 1}. #${bug.number}`)
      .join('\n')}`
  }
  if (topFeatures.length > 0) {
    dashboard_body += `\n\n## Top features\n`
    dashboard_body += `\n${topFeatures
      .map((feature, idx) => `${idx + 1}. #${feature.number}`)
      .join('\n')}`
  }
  if (topPRs.length > 0) {
    dashboard_body += `\n\n## Top PRs\n`
    dashboard_body += `\n${topPRs
      .map((PR, idx) => `${idx + 1}. #${PR.number}`)
      .join('\n')}`
  }
  if (footer) {
    dashboard_body += `\n\n${footer}`
  }
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
 * @param labelDescription  The description of the dashboard label.
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
  await initLabel(owner, repo, label, labelColour, labelDescription)
  let dashboardIssue = issuesWithLabel(issues, label)
  if (dashboardIssue.length === 0) {
    dashboardIssue = issues.filter(issue => issue.title === title)
  }
  if (dashboardIssue.length > 0) {
    octokit.rest.issues.update({
      owner,
      repo,
      issue_number: dashboardIssue[0].number,
      title,
      body: dashboard_body,
      labels: [label]
    })
  } else {
    octokit.rest.issues.create({
      owner,
      repo,
      title,
      body: dashboard_body,
      labels: [label]
    })
  }
}
