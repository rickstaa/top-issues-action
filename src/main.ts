/**
 * @file Main action file.
 */
import {info} from '@actions/core'
import {context, getOctokit} from '@actions/github'
import dotenv from 'dotenv'
import {DASHBOARD_FOOTER, DASHBOARD_HEADER} from './constants'
import {
  createDashboard,
  createDashboardMarkdown,
  fetchOpenIssues,
  fetchOpenPRs,
  getRepoInfo,
  getStringInput,
  getTopIssues,
  issuesWithLabel,
  labelTopIssues
} from './helpers'
import type {IssueNode} from './types'

import {
  BUG_LABEL,
  DASHBOARD,
  DASHBOARD_LABEL,
  DASHBOARD_LABEL_COLOUR,
  DASHBOARD_LABEL_DESCRIPTION,
  DASHBOARD_TITLE,
  FEATURE_LABEL,
  HIDE_DASHBOARD_FOOTER,
  LABEL,
  SUBTRACT_NEGATIVE,
  TOP_BUGS,
  TOP_BUG_LABEL,
  TOP_BUG_LABEL_COLOUR,
  TOP_BUG_LABEL_DESCRIPTION,
  TOP_FEATURES,
  TOP_FEATURE_LABEL,
  TOP_FEATURE_LABEL_COLOUR,
  TOP_FEATURE_LABEL_DESCRIPTION,
  TOP_ISSUES,
  TOP_ISSUE_LABEL,
  TOP_ISSUE_LABEL_COLOUR,
  TOP_ISSUE_LABEL_DESCRIPTION,
  TOP_LIST_SIZE,
  TOP_PULL_REQUEST,
  TOP_PULL_REQUEST_LABEL,
  TOP_PULL_REQUEST_LABEL_COLOUR,
  TOP_PULL_REQUEST_LABEL_DESCRIPTION
} from './inputs'

dotenv.config()

// Create octokit client
const GITHUB_TOKEN: string = getStringInput(
  'github_token',
  process.env.GITHUB_TOKEN ?? ''
)
if (!GITHUB_TOKEN) throw Error('Github token is missing.')
export const octokit = getOctokit(GITHUB_TOKEN)

/**
 * Main function.
 */
async function run(): Promise<void> {
  const {owner, repo} = getRepoInfo(context)
  const issues = await fetchOpenIssues(owner, repo)
  const PRs = await fetchOpenPRs(owner, repo)

  // Give warning if nothing to do.
  if ((!TOP_ISSUES && !TOP_BUGS && !TOP_FEATURES) || (!LABEL && !DASHBOARD)) {
    info('Nothing to do 💤.')
    return
  }

  // Retrieve and label top issues.
  let newTopIssues: IssueNode[] = []
  if (TOP_ISSUES) {
    const currentTopIssues = issuesWithLabel(issues, TOP_ISSUE_LABEL)
    newTopIssues = getTopIssues(issues, TOP_LIST_SIZE, SUBTRACT_NEGATIVE)
    if (LABEL) {
      await labelTopIssues(
        owner,
        repo,
        currentTopIssues,
        newTopIssues,
        TOP_ISSUE_LABEL,
        TOP_ISSUE_LABEL_DESCRIPTION,
        TOP_ISSUE_LABEL_COLOUR
      )
    }
  }

  // Retrieve and label top bugs.
  let newTopBugs: IssueNode[] = []
  if (TOP_BUGS) {
    const bugIssues = issuesWithLabel(issues, BUG_LABEL)
    const currentTopBugs = issuesWithLabel(issues, TOP_BUG_LABEL)
    newTopBugs = getTopIssues(bugIssues, TOP_LIST_SIZE, SUBTRACT_NEGATIVE)
    if (LABEL) {
      await labelTopIssues(
        owner,
        repo,
        currentTopBugs,
        newTopBugs,
        TOP_BUG_LABEL,
        TOP_BUG_LABEL_DESCRIPTION,
        TOP_BUG_LABEL_COLOUR
      )
    }
  }

  // Retrieve and label top features.
  let newTopFeatures: IssueNode[] = []
  if (TOP_FEATURES) {
    const featureIssues = issuesWithLabel(issues, FEATURE_LABEL)
    const currentTopFeatures = issuesWithLabel(issues, TOP_FEATURE_LABEL)
    newTopFeatures = getTopIssues(
      featureIssues,
      TOP_LIST_SIZE,
      SUBTRACT_NEGATIVE
    )
    if (LABEL) {
      await labelTopIssues(
        owner,
        repo,
        currentTopFeatures,
        newTopFeatures,
        TOP_FEATURE_LABEL,
        TOP_FEATURE_LABEL_DESCRIPTION,
        TOP_FEATURE_LABEL_COLOUR
      )
    }
  }

  // Retrieve and label top PRs.
  let newTopPRs: IssueNode[] = []
  if (TOP_PULL_REQUEST) {
    const currentTopPRs = issuesWithLabel(PRs, TOP_PULL_REQUEST_LABEL)
    newTopPRs = getTopIssues(PRs, TOP_LIST_SIZE, SUBTRACT_NEGATIVE)
    if (LABEL) {
      await labelTopIssues(
        owner,
        repo,
        currentTopPRs,
        newTopPRs,
        TOP_PULL_REQUEST_LABEL,
        TOP_PULL_REQUEST_LABEL_DESCRIPTION,
        TOP_PULL_REQUEST_LABEL_COLOUR
      )
    }
  }

  // Create top issues dashboard.
  if (DASHBOARD) {
    const dashboard_body = createDashboardMarkdown(
      newTopIssues,
      newTopBugs,
      newTopFeatures,
      newTopPRs,
      DASHBOARD_HEADER,
      HIDE_DASHBOARD_FOOTER ? DASHBOARD_FOOTER : ''
    )
    createDashboard(
      owner,
      repo,
      issues,
      dashboard_body,
      DASHBOARD_TITLE,
      DASHBOARD_LABEL,
      DASHBOARD_LABEL_COLOUR,
      DASHBOARD_LABEL_DESCRIPTION
    )
  }
}

run()
