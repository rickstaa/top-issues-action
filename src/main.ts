import dotenv from 'dotenv'

import {getOctokit} from '@actions/github'
import {RequestError} from '@octokit/request-error'

dotenv.config()

// Types
interface IssueNode {
  number: number
  title: string
  positive: {totalCount: number}
  negative: {totalCount: number}
  labels: {nodes: {name: string}[]}
}
interface OpenIssues {
  nodes: IssueNode[]
  pageInfo: {endCursor: string; hasNextPage: boolean}
}
interface IssuesResponse {
  repository: {
    open_issues: OpenIssues
  }
}

// Create octokit client
const octokit = getOctokit(`${process.env.GITHUB_TOKEN}`)

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
        `Could not retrieve top issues because GraphQl request due to: ${error.message}.`
      )
    }
    throw error
  }
}

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

const getOldTopIssues = (issues: IssueNode[]): IssueNode[] => {
  return issues.filter((issue: IssueNode) => {
    return issue.labels.nodes.some(label => label.name === 'popular')
  })
}

async function run(): Promise<void> {
  const user = 'anuraghazra'
  const repo = 'github-readme-stats'

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
