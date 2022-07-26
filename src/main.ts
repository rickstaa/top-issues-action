/**
 * @file Main action file.
 */
import {debug, getInput, info, setFailed} from '@actions/core'
import {context, getOctokit} from '@actions/github'
import dotenv from 'dotenv'
import {DASHBOARD_FOOTER, DASHBOARD_HEADER} from './constants'
import {
  createDashboard,
  createDashboardMarkdown,
  fetchOpenIssues,
  fetchOpenPRs,
  getRepoInfo,
  getTopIssues,
  issuesWithLabel,
  labelTopIssues
} from './helpers'
import type {IssueNode} from './types'

dotenv.config()

// == Get action inputs ==
const GITHUB_TOKEN = getInput('github_token')
const TOP_LIST_SIZE = parseInt(getInput('top_list_size'))
const SUBTRACT_NEGATIVE = Boolean(getInput('subtract_negative'))
const LABEL = Boolean(getInput('label'))
const DASHBOARD = Boolean(getInput('dashboard'))
const DASHBOARD_TITLE = getInput('dashboard_title')
const DASHBOARD_LABEL = getInput('dashboard_label')
const DASHBOARD_LABEL_DESCRIPTION = getInput('dashboard_label_description')
const DASHBOARD_LABEL_COLOUR = getInput('dashboard_label_colour')
const HIDE_DASHBOARD_FOOTER = Boolean(getInput('hide_dashboard_footer'))
const TOP_ISSUES = Boolean(getInput('top_issues'))
const TOP_ISSUE_LABEL = getInput('top_issue_label')
const TOP_ISSUE_LABEL_DESCRIPTION = getInput('top_issue_label_description')
const TOP_ISSUE_LABEL_COLOUR = getInput('top_issue_label_colour')
const TOP_BUGS = Boolean(getInput('top_bugs'))
const BUG_LABEL = getInput('bug_label')
const TOP_BUG_LABEL = getInput('top_bug_label')
const TOP_BUG_LABEL_DESCRIPTION = getInput('top_bug_label_description')
const TOP_BUG_LABEL_COLOUR = getInput('top_bug_label_colour')
const TOP_FEATURES = Boolean(getInput('top_features'))
const FEATURE_LABEL = getInput('feature_label')
const TOP_FEATURE_LABEL = getInput('top_feature_label')
const TOP_FEATURE_LABEL_DESCRIPTION = getInput('top_feature_label_description')
const TOP_FEATURE_LABEL_COLOUR = getInput('top_feature_label_colour')
const TOP_PULL_REQUEST = Boolean(getInput('top_pull_request'))
const TOP_PULL_REQUEST_LABEL = getInput('top_pull_request_label')
const TOP_PULL_REQUEST_LABEL_DESCRIPTION = getInput(
  'top_pull_request_label_description'
)
const TOP_PULL_REQUEST_LABEL_COLOUR = getInput('top_pull_request_label_colour')

// Create octokit client
if (!GITHUB_TOKEN) setFailed('Github token is missing.')
export const octokit = getOctokit(GITHUB_TOKEN)

/**
 * Main function.
 */
async function run(): Promise<void> {
  debug('Fetching repo info...')
  const {owner, repo} = getRepoInfo(context)
  debug('Fetching open Issues and PRs...')
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
    debug('Gettting top issues...')
    const currentTopIssues = issuesWithLabel(issues, TOP_ISSUE_LABEL)
    newTopIssues = getTopIssues(issues, TOP_LIST_SIZE, SUBTRACT_NEGATIVE)
    if (LABEL) {
      debug('Labeling top issues...')
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
    debug('Getting top bugs...')
    const bugIssues = issuesWithLabel(issues, BUG_LABEL)
    const currentTopBugs = issuesWithLabel(issues, TOP_BUG_LABEL)
    newTopBugs = getTopIssues(bugIssues, TOP_LIST_SIZE, SUBTRACT_NEGATIVE)
    if (LABEL) {
      debug('Labeling top bugs...')
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
    debug('Getting top features...')
    const featureIssues = issuesWithLabel(issues, FEATURE_LABEL)
    const currentTopFeatures = issuesWithLabel(issues, TOP_FEATURE_LABEL)
    newTopFeatures = getTopIssues(
      featureIssues,
      TOP_LIST_SIZE,
      SUBTRACT_NEGATIVE
    )
    if (LABEL) {
      debug('Labeling top features...')
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
    debug('Getting top PRs...')
    const currentTopPRs = issuesWithLabel(PRs, TOP_PULL_REQUEST_LABEL)
    newTopPRs = getTopIssues(PRs, TOP_LIST_SIZE, SUBTRACT_NEGATIVE)
    if (LABEL) {
      debug('Labeling top PRs...')
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
    debug('Creating dashboard markdown...')
    const dashboard_body = createDashboardMarkdown(
      newTopIssues,
      newTopBugs,
      newTopFeatures,
      newTopPRs,
      DASHBOARD_HEADER,
      HIDE_DASHBOARD_FOOTER ? DASHBOARD_FOOTER : ''
    )
    debug('Creating/updating dashboard issue...')
    await createDashboard(
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
