/**
 * @file Main action file.
 */
import {debug, getInput, info} from '@actions/core'
import {context} from '@actions/github'
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
  labelTopIssues,
  str2bool
} from './helpers'
import type {IssueNode} from './types'

dotenv.config()

// == Get action inputs ==
const TOP_LIST_SIZE = parseInt(getInput('top_list_size'))
const SUBTRACT_NEGATIVE = str2bool(getInput('subtract_negative'))
const DRY_RUN = str2bool(getInput('dry_run'))
const LABEL = str2bool(getInput('label'))
const DASHBOARD = str2bool(getInput('dashboard'))
const DASHBOARD_TITLE = getInput('dashboard_title')
const DASHBOARD_LABEL = getInput('dashboard_label')
const DASHBOARD_LABEL_DESCRIPTION = getInput('dashboard_label_description')
const DASHBOARD_LABEL_COLOUR = getInput('dashboard_label_colour')
const HIDE_DASHBOARD_FOOTER = str2bool(getInput('hide_dashboard_footer'))
const TOP_ISSUES = str2bool(getInput('top_issues'))
const TOP_ISSUE_LABEL = getInput('top_issue_label')
const TOP_ISSUE_LABEL_DESCRIPTION = getInput('top_issue_label_description')
const TOP_ISSUE_LABEL_COLOUR = getInput('top_issue_label_colour')
const TOP_BUGS = str2bool(getInput('top_bugs'))
const BUG_LABEL = getInput('bug_label')
const TOP_BUG_LABEL = getInput('top_bug_label')
const TOP_BUG_LABEL_DESCRIPTION = getInput('top_bug_label_description')
const TOP_BUG_LABEL_COLOUR = getInput('top_bug_label_colour')
const TOP_FEATURES = str2bool(getInput('top_features'))
const FEATURE_LABEL = getInput('feature_label')
const TOP_FEATURE_LABEL = getInput('top_feature_label')
const TOP_FEATURE_LABEL_DESCRIPTION = getInput('top_feature_label_description')
const TOP_FEATURE_LABEL_COLOUR = getInput('top_feature_label_colour')
const TOP_PULL_REQUEST = str2bool(getInput('top_pull_request'))
const TOP_PULL_REQUEST_LABEL = getInput('top_pull_request_label')
const TOP_PULL_REQUEST_LABEL_DESCRIPTION = getInput(
  'top_pull_request_label_description'
)
const TOP_PULL_REQUEST_LABEL_COLOUR = getInput('top_pull_request_label_colour')

// Enable debug logging if dry run is enabled
if (DRY_RUN) {
  info('DRY_RUN is enabled, enabling debug logging')
  process.env['ACTIONS_STEP_DEBUG'] = 'true'
}

/**
 * Main function.
 */
async function run(): Promise<void> {
  debug('Fetching repo info...')
  const {owner, repo} = getRepoInfo(context)
  debug(`Repo: ${repo}, Owner: ${owner}`)
  debug('Fetching open Issues and PRs...')
  const issues = await fetchOpenIssues(owner, repo)
  debug(`Found ${issues.length} open issues.`)
  const PRs = await fetchOpenPRs(owner, repo)
  debug(`Found ${PRs.length} open PRs.`)

  // Give warning if nothing to do.
  if ((!TOP_ISSUES && !TOP_BUGS && !TOP_FEATURES) || (!LABEL && !DASHBOARD)) {
    info('Nothing to do 💤.')
    return
  }

  // Retrieve and label top issues.
  let newTopIssues: IssueNode[] = []
  if (TOP_ISSUES) {
    debug('Getting top issues...')
    const currentTopIssues = issuesWithLabel(issues, TOP_ISSUE_LABEL)
    debug(`Found ${currentTopIssues.length} top issues.`)
    newTopIssues = getTopIssues(issues, TOP_LIST_SIZE, SUBTRACT_NEGATIVE)
    debug(`Found ${newTopIssues.length} new top issues.`)
    if (LABEL) {
      debug('Labeling top issues...')
      if (!DRY_RUN) {
        await labelTopIssues(
          owner,
          repo,
          currentTopIssues,
          newTopIssues,
          TOP_ISSUE_LABEL,
          TOP_ISSUE_LABEL_DESCRIPTION,
          TOP_ISSUE_LABEL_COLOUR
        )
      } else {
        info('DRY_RUN is enabled, skipping labeling top issues.')
      }
    }
  }

  // Retrieve and label top bugs.
  let newTopBugs: IssueNode[] = []
  if (TOP_BUGS) {
    debug('Getting top bugs...')
    const bugIssues = issuesWithLabel(issues, BUG_LABEL)
    debug(`Found ${bugIssues.length} bugs.`)
    const currentTopBugs = issuesWithLabel(issues, TOP_BUG_LABEL)
    debug(`Found ${currentTopBugs.length} top bugs.`)
    newTopBugs = getTopIssues(bugIssues, TOP_LIST_SIZE, SUBTRACT_NEGATIVE)
    debug(`Found ${newTopBugs.length} new top bugs.`)
    if (LABEL) {
      debug('Labeling top bugs...')
      if (!DRY_RUN) {
        await labelTopIssues(
          owner,
          repo,
          currentTopBugs,
          newTopBugs,
          TOP_BUG_LABEL,
          TOP_BUG_LABEL_DESCRIPTION,
          TOP_BUG_LABEL_COLOUR
        )
      } else {
        info('DRY_RUN is enabled, skipping labeling top bugs.')
      }
    }
  }

  // Retrieve and label top features.
  let newTopFeatures: IssueNode[] = []
  if (TOP_FEATURES) {
    debug('Getting top features...')
    const featureIssues = issuesWithLabel(issues, FEATURE_LABEL)
    debug(`Found ${featureIssues.length} features.`)
    const currentTopFeatures = issuesWithLabel(issues, TOP_FEATURE_LABEL)
    debug(`Found ${currentTopFeatures.length} top features.`)
    newTopFeatures = getTopIssues(
      featureIssues,
      TOP_LIST_SIZE,
      SUBTRACT_NEGATIVE
    )
    if (LABEL) {
      debug('Labeling top features...')
      if (!DRY_RUN) {
        await labelTopIssues(
          owner,
          repo,
          currentTopFeatures,
          newTopFeatures,
          TOP_FEATURE_LABEL,
          TOP_FEATURE_LABEL_DESCRIPTION,
          TOP_FEATURE_LABEL_COLOUR
        )
      } else {
        info('DRY_RUN is enabled, skipping labeling top features.')
      }
    }
  }

  // Retrieve and label top PRs.
  let newTopPRs: IssueNode[] = []
  if (TOP_PULL_REQUEST) {
    debug('Getting top PRs...')
    const currentTopPRs = issuesWithLabel(PRs, TOP_PULL_REQUEST_LABEL)
    debug(`Found ${currentTopPRs.length} top PRs.`)
    newTopPRs = getTopIssues(PRs, TOP_LIST_SIZE, SUBTRACT_NEGATIVE)
    debug(`Found ${newTopPRs.length} new top PRs.`)
    if (LABEL) {
      debug('Labeling top PRs...')
      if (!DRY_RUN) {
        await labelTopIssues(
          owner,
          repo,
          currentTopPRs,
          newTopPRs,
          TOP_PULL_REQUEST_LABEL,
          TOP_PULL_REQUEST_LABEL_DESCRIPTION,
          TOP_PULL_REQUEST_LABEL_COLOUR
        )
      } else {
        info('DRY_RUN is enabled, skipping labeling top PRs.')
      }
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
    debug(`Dashboard body: ${dashboard_body}`)
    debug('Creating/updating dashboard issue...')
    if (!DRY_RUN) {
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
    } else {
      info('DRY_RUN is enabled, skipping creating/updating dashboard issue.')
    }
  }
}

run()
