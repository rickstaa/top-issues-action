import dotenv from 'dotenv'

import {getOctokit} from '@actions/github'

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
}

const getTopIssues = (issues: IssueNode[], size: number): IssueNode[] => {
  issues = issues.sort((a: IssueNode, b: IssueNode) => {
    return (
      b.positive.totalCount -
      b.negative.totalCount -
      (a.positive.totalCount - a.negative.totalCount)
    )
  })
  return issues.slice(0, size)
}

async function run(): Promise<void> {
  const user = 'anuraghazra'
  const repo = 'github-readme-stats'

  // Retrieve issues
  let issues: IssueNode[]
  try {
    issues = await fetchOpenIssues(user, repo)
  } catch (error) {
    // TODO: see https://github.com/octokit/request-error.js/issues/246
    if (error instanceof Error && error.name === 'HttpError') {
      console.error(`GraphQl request failed due to: ${error.message}`)
    }
    throw error
  }

  // Retrieve top 10 issues
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
  console.log('title')
}

run()
