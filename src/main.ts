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
  user: string
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
  return issues.filter((issue: IssueNode) => {
    return issue.labels.nodes.some(label => label.name === 'popular')
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
      user: ctx.repo.owner,
      repo: ctx.repo.repo
    }
  } catch (error) {
    return {
      user: 'rickstaa',
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

/**
 * Main function.
 */
async function run(): Promise<void> {
  const {user, repo} = getRepoInfo(context)

  // Retrieve top issues
  const issues = await fetchOpenIssues(user, repo)
  const oldTopIssues = getOldTopIssues(issues)
  const topIssues = getTopIssues(issues, 10)

  // Print Top Issues
  console.log('Top 10 issues:')
  for (const issue of topIssues) {
    console.log(
      `  - ${issue.title}: ${
        issue.positive.totalCount - issue.negative.totalCount
      }`
    )
  }
}

run()
