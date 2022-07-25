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
 * @param issues Issues object to get the top issues from.
 * @param size Number of issues to get.
 * @returns Top issues.
 */
const getTopIssues = (issues: IssueNode[], size: number): IssueNode[] => {
  issues = issues.filter(issue =>
    subtract_negative
      ? issue.positive.totalCount - issue.negative.totalCount
      : issue.positive.totalCount > 0
  ) // Remove issues with no reactions
  issues = issues.sort((a: IssueNode, b: IssueNode) => {
    return subtract_negative
      ? b.positive.totalCount -
          b.negative.totalCount -
          (a.positive.totalCount - a.negative.totalCount)
      : b.positive.totalCount - a.positive.totalCount
  })
  return issues.slice(0, size)
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
const subtract_negative: number = getInput('subtract_negative')
  ? Boolean(getInput('subtract_negative'))
  : true
const top_list_size: number = getInput('top_list_size')
  ? parseInt(getInput('top_list_size'))
  : 10
const top_issue_label: string = getInput('top_issue_label')
  ? getInput('top_issue_label')
  : 'top issue'
const bug_label: string = getInput('bug_label') ? getInput('bug_label') : 'bug'
const top_bug_label: string = getInput('top_bug_label')
  ? getInput('top_bug_label')
  : 'top bug'
const feature_label: string = getInput('feature_label')
  ? getInput('feature_label')
  : 'enhancement'
const top_feature_label: string = getInput('top_feature_label')
  ? getInput('top_feature_label')
  : 'top feature'

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
 * Label the top issues.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param currentTopIssues Current top issues.
 * @param newTopIssues  New top issues.
 * @param topIssuesLabel  Label to add to the top issues.
 */
const labelTopIssues = (
  owner: string,
  repo: string,
  currentTopIssues: IssueNode[],
  newTopIssues: IssueNode[],
  topIssuesLabel: string
): void => {
  labelIssues(owner, repo, newTopIssues, topIssuesLabel)
  const topIssuesToPrune = getIssuesDifference(currentTopIssues, newTopIssues)
  removeLabelFromIssues(owner, repo, topIssuesToPrune, topIssuesLabel)
}

/**
 * Main function.
 */
async function run(): Promise<void> {
  const {owner, repo} = getRepoInfo(context)
  const issues = await fetchOpenIssues(owner, repo)

  // Retrieve and label top issues
  const currentTopIssues = issuesWithLabel(issues, top_issue_label)
  const newTopIssues = getTopIssues(issues, top_list_size)
  labelTopIssues(owner, repo, currentTopIssues, newTopIssues, top_issue_label)

  // Retrieve and label top bugs
  const bugIssues = issuesWithLabel(issues, bug_label)
  const currentTopBugs = issuesWithLabel(issues, top_bug_label)
  const newTopBugs = getTopIssues(bugIssues, top_list_size)
  labelTopIssues(owner, repo, currentTopBugs, newTopBugs, top_bug_label)

  // Retrieve and label top features
  const featureIssues = issuesWithLabel(issues, feature_label)
  const currentTopFeatures = issuesWithLabel(issues, top_feature_label)
  const newTopFeatures = getTopIssues(featureIssues, top_list_size)
  labelTopIssues(
    owner,
    repo,
    currentTopFeatures,
    newTopFeatures,
    top_feature_label
  )
}

run()
