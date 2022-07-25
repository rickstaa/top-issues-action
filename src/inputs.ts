/**
 * Contains the action inputs.
 */

import {getBooleanInput, getIntegerInput, getStringInput} from './helpers'

// General inputs.
export const TOP_LIST_SIZE = getIntegerInput('top_list_size', 10)
export const SUBTRACT_NEGATIVE = getBooleanInput('subtract_negative', true)
export const LABEL = getBooleanInput('label', false)
export const DASHBOARD = getBooleanInput('dashboard', true)

// Dashboard related inputs.
export const DASHBOARD_TITLE = getStringInput(
  'dashboard_title',
  'Top Issues Dashboard'
)
export const DASHBOARD_LABEL = getStringInput(
  'dashboard_label',
  ':star: top issues dashboard'
)
export const DASHBOARD_LABEL_DESCRIPTION = getStringInput(
  'dashboard_label_description',
  'Top issues dashboard.'
)
export const DASHBOARD_LABEL_COLOUR = getStringInput(
  'dashboard_label_colour',
  '#EED801'
)
export const HIDE_DASHBOARD_FOOTER = getBooleanInput(
  'hide_dashboard_footer',
  false
)

// Top issues related inputs.
export const TOP_ISSUES = getBooleanInput('top_issues', true)
export const TOP_ISSUE_LABEL = getStringInput(
  'top_issue_label',
  ':star: top issue'
)
export const TOP_ISSUE_LABEL_DESCRIPTION = getStringInput(
  'top_issue_label_description',
  'Top issue.'
)
export const TOP_ISSUE_LABEL_COLOUR = getStringInput(
  'top_issue_label_colour',
  '#027E9D'
)

// Top bugs related inputs.
export const TOP_BUGS = getBooleanInput('top_bugs', true)
export const BUG_LABEL = getStringInput('bug_label', 'bug')
export const TOP_BUG_LABEL = getStringInput('top_bug_label', ':star: top bug')
export const TOP_BUG_LABEL_DESCRIPTION = getStringInput(
  'top_bug_label_description',
  'Top bug.'
)
export const TOP_BUG_LABEL_COLOUR = getStringInput(
  'top_bug_label_colour',
  '#B60205'
)

// Top features related inputs.
export const TOP_FEATURES = getBooleanInput('top_features', true)
export const FEATURE_LABEL = getStringInput('feature_label', 'enhancement')
export const TOP_FEATURE_LABEL = getStringInput(
  'top_feature_label',
  ':star: top feature'
)
export const TOP_FEATURE_LABEL_DESCRIPTION = getStringInput(
  'top_feature_label_text',
  'Top feature request.'
)
export const TOP_FEATURE_LABEL_COLOUR = getStringInput(
  'top_feature_label_colour',
  '#0E8A16'
)

// Pull request related inputs.
export const TOP_PULL_REQUEST = getBooleanInput('top_pull_requests', true)
export const TOP_PULL_REQUEST_LABEL = getStringInput(
  'top_pull_request_label',
  ':star: top pull request'
)
export const TOP_PULL_REQUEST_LABEL_DESCRIPTION = getStringInput(
  'top_pull_request_label_text',
  'Top pull request.'
)
export const TOP_PULL_REQUEST_LABEL_COLOUR = getStringInput(
  'top_pull_request_label_colour',
  '#41A285'
)
