/**
 * @file Main action file.
 */
import {debug, getBooleanInput, getInput, info, warning} from '@actions/core'
import {context} from '@actions/github'
import dotenv from 'dotenv'
import {DASHBOARD_FOOTER, DASHBOARD_HEADER} from './constants'
import {
  array2str,
  createDashboard,
  createDashboardMarkdown,
  fetchOpenIssues,
  fetchOpenPRs,
  getMultilineInput,
  getRepoInfo,
  getTopIssues,
  issuesWithLabel,
  labelTopIssues
} from './helpers'
import {TopIssueNode} from './types'

dotenv.config()

// == Get action inputs ==
const TOP_LIST_SIZE = parseInt(getInput('top_list_size'))
const SUBTRACT_NEGATIVE = getBooleanInput('subtract_negative')
const DRY_RUN = getBooleanInput('dry_run')
const FILTER = getMultilineInput('filter').map(str => Number(str))
const LABEL = getBooleanInput('label')
const DASHBOARD = getBooleanInput('dashboard')
const DASHBOARD_SHOW_TOTAL_REACTIONS = getBooleanInput(
  'dashboard_show_total_reactions'
)
const DASHBOARD_TITLE = getInput('dashboard_title')
const DASHBOARD_LABEL = getInput('dashboard_label')
const DASHBOARD_LABEL_DESCRIPTION = getInput('dashboard_label_description')
const DASHBOARD_LABEL_COLOUR = getInput('dashboard_label_colour')
const HIDE_DASHBOARD_FOOTER = getBooleanInput('hide_dashboard_footer')
const TOP_ISSUES = getBooleanInput('top_issues')
const TOP_ISSUE_LABEL = getInput('top_issue_label')
const TOP_ISSUE_LABEL_DESCRIPTION = getInput('top_issue_label_description')
const TOP_ISSUE_LABEL_COLOUR = getInput('top_issue_label_colour')
const TOP_BUGS = getBooleanInput('top_bugs')
const BUG_LABEL = getInput('bug_label')
const TOP_BUG_LABEL = getInput('top_bug_label')
const TOP_BUG_LABEL_DESCRIPTION = getInput('top_bug_label_description')
const TOP_BUG_LABEL_COLOUR = getInput('top_bug_label_colour')
const TOP_FEATURES = getBooleanInput('top_features')
const FEATURE_LABEL = getInput('feature_label')
const TOP_FEATURE_LABEL = getInput('top_feature_label')
const TOP_FEATURE_LABEL_DESCRIPTION = getInput('top_feature_label_description')
const TOP_FEATURE_LABEL_COLOUR = getInput('top_feature_label_colour')
const TOP_PULL_REQUESTS = getBooleanInput('top_pull_requests')
const TOP_PULL_REQUEST_LABEL = getInput('top_pull_request_label')
const TOP_PULL_REQUEST_LABEL_DESCRIPTION = getInput(
  'top_pull_request_label_description'
)
const TOP_PULL_REQUEST_LABEL_COLOUR = getInput('top_pull_request_label_colour')
const CUSTOM_LABEL = getInput('custom_label')
const TOP_CUSTOM_LABEL = getInput('top_custom_label')
const TOP_CUSTOM_LABEL_DESCRIPTION = getInput('top_custom_label_description')
const TOP_CUSTOM_LABEL_COLOUR = getInput('top_custom_label_colour')
const CUSTOM_PRS_LABEL = getInput('custom_pull_requests_label')
const TOP_CUSTOM_PULL_REQUESTS_LABEL = getInput(
  'top_custom_pull_requests_label'
)
const TOP_CUSTOM_PULL_REQUESTS_LABEL_DESCRIPTION = getInput(
  'top_custom_pull_requests_label_description'
)
const TOP_CUSTOM_PULL_REQUESTS_LABEL_COLOUR = getInput(
  'top_custom_pull_requests_label_colour'
)

/**
 * Main function.
 */
async function run(): Promise<void> {
  debug('Fetching repo info...')
  const {owner, repo} = getRepoInfo(context)
  debug(`Repo: ${repo}, Owner: ${owner}.`)
  debug('Fetching open Issues...')
  if (FILTER.length > 0) {
    debug(`Filtered issues: ${array2str(FILTER.map(num => String(num)))}.`)
  }
  const issues = await fetchOpenIssues(owner, repo)
  debug(`Found ${issues.length} open issues.`)
  debug('Fetching open PRs...')
  const PRs = await fetchOpenPRs(owner, repo)
  debug(`Found ${PRs.length} open PRs.`)

  // Give warning if nothing to do.
  if ((!TOP_ISSUES && !TOP_BUGS && !TOP_FEATURES) || (!LABEL && !DASHBOARD)) {
    info('Nothing to do 💤.')
    return
  }

  // Retrieve and label top issues.
  let newTopIssues: TopIssueNode[] = []
  if (TOP_ISSUES) {
    debug('Getting old top issues...')
    const oldTopIssues = issuesWithLabel(issues, TOP_ISSUE_LABEL)
    debug(`Found ${oldTopIssues.length} old top issues.`)
    debug(
      `Old top issues: ${array2str(
        oldTopIssues.map(issue => issue.number.toString())
      )}.`
    )
    debug(`Getting new top issues...`)
    newTopIssues = getTopIssues(
      issues,
      TOP_LIST_SIZE,
      SUBTRACT_NEGATIVE,
      DASHBOARD_LABEL,
      FILTER
    )
    debug(`Found ${newTopIssues.length} new top issues.`)
    debug(
      `New top issues: ${array2str(
        newTopIssues.map(issue => issue.number.toString())
      )}.`
    )
    if (LABEL) {
      debug('Labeling top issues...')
      if (!DRY_RUN) {
        await labelTopIssues(
          owner,
          repo,
          oldTopIssues,
          newTopIssues,
          TOP_ISSUE_LABEL,
          TOP_ISSUE_LABEL_DESCRIPTION,
          TOP_ISSUE_LABEL_COLOUR
        )
      } else {
        warning('DRY_RUN is enabled, skipping labeling of top issues.')
      }
    }
  }

  // Retrieve and label top bugs.
  let newTopBugs: TopIssueNode[] = []
  if (TOP_BUGS) {
    debug('Getting bugs...')
    const bugIssues = issuesWithLabel(issues, BUG_LABEL)
    debug(`Found ${bugIssues.length} bugs.`)
    debug(`Getting old top bugs...`)
    const oldTopBugs = issuesWithLabel(issues, TOP_BUG_LABEL)
    debug(`Found ${oldTopBugs.length} old top bugs.`)
    debug(
      `Old top bugs: ${array2str(
        oldTopBugs.map(bug => bug.number.toString())
      )}.`
    )
    debug(`Getting new top bugs...`)
    newTopBugs = getTopIssues(
      bugIssues,
      TOP_LIST_SIZE,
      SUBTRACT_NEGATIVE,
      DASHBOARD_LABEL,
      FILTER
    )
    debug(`Found ${newTopBugs.length} new top bugs.`)
    debug(
      `New top bugs: ${array2str(
        newTopBugs.map(bug => bug.number.toString())
      )}.`
    )
    if (LABEL) {
      debug('Labeling top bugs...')
      if (!DRY_RUN) {
        await labelTopIssues(
          owner,
          repo,
          oldTopBugs,
          newTopBugs,
          TOP_BUG_LABEL,
          TOP_BUG_LABEL_DESCRIPTION,
          TOP_BUG_LABEL_COLOUR
        )
      } else {
        warning('DRY_RUN is enabled, skipping labeling of top bugs.')
      }
    }
  }

  // Retrieve and label top features.
  let newTopFeatures: TopIssueNode[] = []
  if (TOP_FEATURES) {
    debug('Getting feature requests...')
    const featureIssues = issuesWithLabel(issues, FEATURE_LABEL)
    debug(`Found ${featureIssues.length} feature requests.`)
    debug(`Getting old top feature requests...`)
    const oldTopFeatures = issuesWithLabel(issues, TOP_FEATURE_LABEL)
    debug(`Found ${oldTopFeatures.length} old top feature requests.`)
    debug(
      `Old top feature requests: ${array2str(
        oldTopFeatures.map(feature => feature.number.toString())
      )}.`
    )
    debug(`Getting new top feature requests...`)
    newTopFeatures = getTopIssues(
      featureIssues,
      TOP_LIST_SIZE,
      SUBTRACT_NEGATIVE,
      DASHBOARD_LABEL,
      FILTER
    )
    debug(`Found ${newTopFeatures.length} new top feature requests.`)
    debug(
      `New top feature requests: ${array2str(
        newTopFeatures.map(feature => feature.number.toString())
      )}.`
    )
    if (LABEL) {
      debug('Labeling top feature requests...')
      if (!DRY_RUN) {
        await labelTopIssues(
          owner,
          repo,
          oldTopFeatures,
          newTopFeatures,
          TOP_FEATURE_LABEL,
          TOP_FEATURE_LABEL_DESCRIPTION,
          TOP_FEATURE_LABEL_COLOUR
        )
      } else {
        warning(
          'DRY_RUN is enabled, skipping labeling of top feature requests.'
        )
      }
    }
  }

  // Retrieve and label top PRs.
  let newTopPRs: TopIssueNode[] = []
  if (TOP_PULL_REQUESTS) {
    debug('Getting old top PRs...')
    const oldTopPRs = issuesWithLabel(PRs, TOP_PULL_REQUEST_LABEL)
    debug(`Found ${oldTopPRs.length} old top PRs.`)
    debug(`Getting new top PRs...`)
    newTopPRs = getTopIssues(
      PRs,
      TOP_LIST_SIZE,
      SUBTRACT_NEGATIVE,
      DASHBOARD_LABEL,
      FILTER
    )
    debug(`Found ${newTopPRs.length} new top PRs.`)
    debug(
      `New top PRs: ${array2str(newTopPRs.map(PR => PR.number.toString()))}.`
    )
    if (LABEL) {
      debug('Labeling top PRs...')
      if (!DRY_RUN) {
        await labelTopIssues(
          owner,
          repo,
          oldTopPRs,
          newTopPRs,
          TOP_PULL_REQUEST_LABEL,
          TOP_PULL_REQUEST_LABEL_DESCRIPTION,
          TOP_PULL_REQUEST_LABEL_COLOUR
        )
      } else {
        info('DRY_RUN is enabled, skipping labeling of top PRs.')
      }
    }
  }

  // Retrieve and label top custom.
  let newTopCustom: TopIssueNode[] = []
  if (CUSTOM_LABEL) {
    debug(`Getting issues with '${CUSTOM_LABEL}' label...`)
    const customIssues = issuesWithLabel(issues, CUSTOM_LABEL)
    debug(`Found ${customIssues.length} '${CUSTOM_LABEL}' issues.`)
    debug(`Getting old top '${CUSTOM_LABEL}' issues...`)
    const oldTopCustom = issuesWithLabel(issues, TOP_CUSTOM_LABEL)
    debug(`Found ${oldTopCustom.length} old '${CUSTOM_LABEL}' issues.`)
    debug(
      `Old top '${CUSTOM_LABEL}' issues: ${array2str(
        oldTopCustom.map(issue => issue.number.toString())
      )}.`
    )
    debug(`Getting new top '${CUSTOM_LABEL}' issues...`)
    newTopCustom = getTopIssues(
      customIssues,
      TOP_LIST_SIZE,
      SUBTRACT_NEGATIVE,
      DASHBOARD_LABEL,
      FILTER
    )
    debug(`Found ${newTopCustom.length} new top '${CUSTOM_LABEL}' issues.`)
    debug(
      `New top '${CUSTOM_LABEL}' issues: ${array2str(
        newTopCustom.map(issue => issue.number.toString())
      )}.`
    )
    if (LABEL) {
      debug(`Labeling top '${CUSTOM_LABEL}' issues...`)
      if (!DRY_RUN) {
        await labelTopIssues(
          owner,
          repo,
          oldTopCustom,
          newTopCustom,
          TOP_CUSTOM_LABEL,
          TOP_CUSTOM_LABEL_DESCRIPTION,
          TOP_CUSTOM_LABEL_COLOUR
        )
      } else {
        warning(
          'DRY_RUN is enabled, skipping labeling of top feature requests.'
        )
      }
    }
  }

  // Retrieve and label top custom PRs.
  let newTopCustomPRs: TopIssueNode[] = []
  if (CUSTOM_PRS_LABEL) {
    debug(`Getting pull requests with '${CUSTOM_PRS_LABEL}' label...`)
    const customPRs = issuesWithLabel(PRs, CUSTOM_PRS_LABEL)
    debug(`Found ${customPRs.length} '${CUSTOM_PRS_LABEL}' pull requests.`)
    debug(`Getting old top '${CUSTOM_PRS_LABEL}' pull requests...`)
    const oldTopCustomPRs = issuesWithLabel(PRs, TOP_CUSTOM_PULL_REQUESTS_LABEL)
    debug(
      `Found ${oldTopCustomPRs.length} old '${CUSTOM_PRS_LABEL}' pull requests.`
    )
    debug(
      `Old top feature requests: ${array2str(
        oldTopCustomPRs.map(pr => pr.number.toString())
      )}.`
    )
    debug(`Getting new top '${CUSTOM_PRS_LABEL}' pull requests...`)
    newTopCustomPRs = getTopIssues(
      customPRs,
      TOP_LIST_SIZE,
      SUBTRACT_NEGATIVE,
      DASHBOARD_LABEL,
      FILTER
    )
    debug(
      `Found ${newTopCustomPRs.length} new top '${CUSTOM_PRS_LABEL}' pull requests.`
    )
    debug(
      `New top '${CUSTOM_PRS_LABEL}' pull requests: ${array2str(
        newTopCustomPRs.map(pr => pr.number.toString())
      )}.`
    )
    if (LABEL) {
      debug(`Labeling top '${CUSTOM_PRS_LABEL}' pull requests...`)
      if (!DRY_RUN) {
        await labelTopIssues(
          owner,
          repo,
          oldTopCustomPRs,
          newTopCustomPRs,
          TOP_CUSTOM_PULL_REQUESTS_LABEL,
          TOP_CUSTOM_PULL_REQUESTS_LABEL_DESCRIPTION,
          TOP_CUSTOM_PULL_REQUESTS_LABEL_COLOUR
        )
      } else {
        warning(
          'DRY_RUN is enabled, skipping labeling of top feature requests.'
        )
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
      newTopCustom,
      CUSTOM_LABEL,
      newTopCustomPRs,
      CUSTOM_PRS_LABEL,
      DASHBOARD_HEADER,
      !HIDE_DASHBOARD_FOOTER ? DASHBOARD_FOOTER : '',
      DASHBOARD_SHOW_TOTAL_REACTIONS
    )
    DRY_RUN
      ? info(`Dashboard body: ${dashboard_body}.`)
      : debug(`Dashboard body: ${dashboard_body}.`)
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
      warning('DRY_RUN is enabled, skipping creating/updating dashboard issue.')
    }
  }
}

run()
