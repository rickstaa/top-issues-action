import dotenv from 'dotenv'

import {getInput} from '@actions/core'
import {context, getOctokit} from '@actions/github'
import {RequestError} from '@octokit/request-error'

dotenv.config()

/**
 * Issue object returned by GraphQL.
 */
interface IssueNode {
  number: number
  title: string
  positive: {totalCount: number}
  negative: {totalCount: number}
  labels: {nodes: {name: string}[]}
}

/**
 * Open issues object returned by GraphQL.
 */
interface OpenIssues {
  nodes: IssueNode[]
  pageInfo: {endCursor: string; hasNextPage: boolean}
}

/**
 *  Issues response object returned by GraphQL.
 */
interface IssuesResponse {
  repository: {
    open_issues: OpenIssues
  }
}

/**
 * Repository info.
 */
interface RepoInfo {
  owner: string
  repo: string
}

type GithubContext = typeof context

/**
 * Fetches open issues from a repository.
 * @param user The user name of the repository owner.
 * @param repo The name of the repository.
 * @returns The open issues.
 */
const fetchOpenIssues = async (
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
      throw Error(
        `Could not retrieve top issues using GraphQl: ${error.message}.`
      )
    }
    throw error
  }
}

/**
 * Get the top issues.
 * @param issues Issues to get the top issues from.
 * @param size Number of issues to get.
 * @returns Top issues.
 */
const getTopIssues = (issues: IssueNode[], size: number): IssueNode[] => {
  issues = issues.filter(
    issue => issue.positive.totalCount - issue.negative.totalCount > 0
  ) // Remove issues with no reactions
  issues = issues.sort((a: IssueNode, b: IssueNode) => {
    return (
      b.positive.totalCount -
      b.negative.totalCount -
      (a.positive.totalCount - a.negative.totalCount)
    )
  })
  return issues.slice(0, size)
}

/**
 * Get the old top issues.
 * @param issues Issues to get the old top issues from.
 * @returns Old top issues.
 */
const getOldTopIssues = (issues: IssueNode[]): IssueNode[] => {
  return issuesWithLabel(issues, 'top issue')
}

/**
 * Retrieve issues that have the label.
 * @param issues The issues to check.
 * @param label The label to check for.
 */
const issuesWithLabel = (issues: IssueNode[], label: string): IssueNode[] => {
  return issues.filter((issue: IssueNode) => {
    return issue.labels.nodes.some(lab => lab.name === label)
  })
}

/**
 * Retrieve information about the repository that ran the action.
 * @param context Action context.
 * @returns Repository information.
 */
const getRepoInfo = (ctx: GithubContext): RepoInfo => {
  try {
    return {
      owner: ctx.repo.owner,
      repo: ctx.repo.repo
    }
  } catch (error) {
    return {
      owner: 'rickstaa',
      repo: 'top-issues-action'
    }
  }
}

// Create octokit client
const github_token: string | undefined = getInput('github_token')
  ? getInput('github_token')
  : process.env.GITHUB_TOKEN
if (!github_token) throw Error('Github token is missing.')
const octokit = getOctokit(github_token)

// Get action inputs
const top_list_size: number = getInput('top_list_size')
  ? parseInt(getInput('top_list_size'))
  : 10
const top_issues_label: string = getInput('top_issues_label')
  ? getInput('top_issues_label')
  : 'top issues'

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
 * Rove a label from a list of issues.
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
 * Main function.
 */
async function run(): Promise<void> {
  const {owner, repo} = getRepoInfo(context)

  // Retrieve and label top issues
  const issues = await fetchOpenIssues(owner, repo)
  const currentTopIssues = getOldTopIssues(issues)
  const newTopIssues = getTopIssues(issues, top_list_size)
  labelIssues(owner, repo, newTopIssues, top_issues_label)
  const topIssuesToPrune = getIssuesDifference(currentTopIssues, newTopIssues)
  removeLabelFromIssues(owner, repo, topIssuesToPrune, top_issues_label)

  // Print Top Issues
  console.log('Top 10 issues:')
  for (const issue of newTopIssues) {
    console.log(
      `  - ${issue.title}: ${
        issue.positive.totalCount - issue.negative.totalCount
      }`
    )
  }
}

run()
