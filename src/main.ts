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
 * PR object returned by GraphQL.
 */
interface PRNode {
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
 * Open PRs object returned by GraphQL.
 */
interface OpenPRs {
  nodes: PRNode[]
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
interface PRsResponse {
  repository: {
    open_prs: OpenPRs
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
 * Fetch open issues from a repository.
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
 * Fetch open PRs from a repository.
 * @param user The user name of the repository owner.
 * @param repo The name of the repository.
 * @returns The open PRs.
 */
const fetchOpenPRs = async (user: string, repo: string): Promise<PRNode[]> => {
  try {
    const {repository} = await octokit.graphql<PRsResponse>(
      `
        {
          repository(owner: "${user}", name: "${repo}") {
            open_prs: pullRequests(first: 100, states: OPEN){
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
    return repository.open_prs.nodes
  } catch (error) {
    if (error instanceof RequestError) {
      throw Error(`Could not retrieve top PRs using GraphQl: ${error.message}.`)
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
const top_list_size: number = getInput('top_list_size')
  ? parseInt(getInput('top_list_size'))
  : 10
const subtract_negative: boolean = getInput('subtract_negative')
  ? Boolean(getInput('subtract_negative'))
  : true

const top_issues: boolean = getInput('top_issues')
  ? Boolean('top_issues')
  : true
const top_issue_label: string = getInput('top_issue_label')
  ? getInput('top_issue_label')
  : ':star: top issue'
const top_issue_label_description: string = getInput(
  'top_issue_label_description'
)
  ? getInput('top_issue_label_description')
  : 'Top issue.'
const top_issue_label_colour: string = getInput('top_issue_label_colour')
  ? getInput('top_issue_label_colour')
  : '#027E9D'

const top_bugs: boolean = getInput('top_bugs') ? Boolean('top_bugs') : true
const bug_label: string = getInput('bug_label') ? getInput('bug_label') : 'bug'
const top_bug_label: string = getInput('top_bug_label')
  ? getInput('top_bug_label')
  : ':star: top bug'
const top_bug_label_text: string = getInput('top_bug_label_text')
  ? getInput('top_bug_label_text')
  : 'Top bug.'
const top_bug_label_colour: string = getInput('top_bug_label_colour')
  ? getInput('top_bug_label_colour')
  : '#B60205'

const top_features: boolean = getInput('top_features')
  ? Boolean('top_features')
  : true
const feature_label: string = getInput('feature_label')
  ? getInput('feature_label')
  : 'enhancement'
const top_feature_label: string = getInput('top_feature_label')
  ? getInput('top_feature_label')
  : ':star: top feature'
const top_feature_label_text: string = getInput('top_feature_label_text')
  ? getInput('top_feature_label_text')
  : 'Top feature request.'
const top_feature_label_colour: string = getInput('top_feature_label_colour')
  ? getInput('top_feature_label_colour')
  : '#0E8A16'

const top_pull_requests: boolean = getInput('top_pull_requests')
  ? Boolean('top_pull_requests')
  : true
const top_pull_request_label: string = getInput('top_pull_request_label')
  ? getInput('top_pull_request_label')
  : ':star: top pull request'
const top_pull_request_label_text: string = getInput(
  'top_pull_request_label_text'
)
  ? getInput('top_pull_request_label_text')
  : 'Top pull request.'
const top_pull_request_label_colour: string = getInput(
  'top_pull_request_label_colour'
)
  ? getInput('top_pull_request_label_colour')
  : '#0E8A16'

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
 * Make sure that the label exists with the correct colour and description.
 * @param owner The owner of the repository.
 * @param repo The name of the repository.
 * @param topIssueLabel The label to check.
 * @param topIssueLabelDescription The description of the label.
 * @param topIssueLabelColour The colour of the label.
 */
const initTopLabel = async (
  owner: string,
  repo: string,
  topIssueLabel: string,
  topIssueLabelColour: string,
  topIssueLabelDescription: string
): Promise<void> => {
  const topIssueLabelColourBare = topIssueLabelColour.replace('#', '')

  return new Promise(async (resolve, reject) => {
    try {
      const labels = await octokit.rest.issues.listLabelsForRepo({
        owner,
        repo
      })
      const label = labels.data.find(
        ({name: labelName}) => labelName === topIssueLabel
      )

      // Create label if it doesn't exist and update it if it does.
      if (!label) {
        await octokit.rest.issues.createLabel({
          owner,
          repo,
          name: topIssueLabel,
          color: topIssueLabelColourBare,
          description: topIssueLabelDescription
        })
      } else {
        if (
          label.description !== topIssueLabelDescription ||
          label.color !== topIssueLabelColourBare
        ) {
          await octokit.rest.issues.updateLabel({
            owner,
            repo,
            name: topIssueLabel,
            color: topIssueLabelColour,
            description: topIssueLabelDescription
          })
        }
      }
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Label the top issues.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param currentTopIssues Current top issues.
 * @param newTopIssues New top issues.
 * @param topIssueLabel Label to add to the top issues.
 * @param topIssueLabelDescription Description of the top issues label.
 * @param topIssueLabelColour Colour of the top issues label.
 */
const labelTopIssues = async (
  owner: string,
  repo: string,
  currentTopIssues: IssueNode[],
  newTopIssues: IssueNode[],
  topIssueLabel: string,
  topIssueLabelDescription: string,
  topIssueLabelColour: string
): Promise<void> => {
  await initTopLabel(
    owner,
    repo,
    topIssueLabel,
    topIssueLabelColour,
    topIssueLabelDescription
  )
  labelIssues(owner, repo, newTopIssues, topIssueLabel)
  const topIssuesToPrune = getIssuesDifference(currentTopIssues, newTopIssues)
  removeLabelFromIssues(owner, repo, topIssuesToPrune, topIssueLabel)
}

/**
 * Main function.
 */
async function run(): Promise<void> {
  const {owner, repo} = getRepoInfo(context)
  const issues = await fetchOpenIssues(owner, repo)
  const PRs = await fetchOpenPRs(owner, repo)

  // Give warning if nothing to do.
  if (!top_issues && !top_bugs && !top_features) {
    console.log('Nothing to do 💤.') // Replace with action log.
    return
  }

  // Retrieve and label top issues
  if (top_issues) {
    const currentTopIssues = issuesWithLabel(issues, top_issue_label)
    const newTopIssues = getTopIssues(issues, top_list_size)
    await labelTopIssues(
      owner,
      repo,
      currentTopIssues,
      newTopIssues,
      top_issue_label,
      top_issue_label_description,
      top_issue_label_colour
    )
  }

  // Retrieve and label top bugs
  if (top_bugs) {
    const bugIssues = issuesWithLabel(issues, bug_label)
    const currentTopBugs = issuesWithLabel(issues, top_bug_label)
    const newTopBugs = getTopIssues(bugIssues, top_list_size)
    await labelTopIssues(
      owner,
      repo,
      currentTopBugs,
      newTopBugs,
      top_bug_label,
      top_bug_label_text,
      top_bug_label_colour
    )
  }

  // Retrieve and label top features
  if (top_features) {
    const featureIssues = issuesWithLabel(issues, feature_label)
    const currentTopFeatures = issuesWithLabel(issues, top_feature_label)
    const newTopFeatures = getTopIssues(featureIssues, top_list_size)
    await labelTopIssues(
      owner,
      repo,
      currentTopFeatures,
      newTopFeatures,
      top_feature_label,
      top_feature_label_text,
      top_feature_label_colour
    )
  }

  // Retrieve and label top PRs
  if (top_pull_requests) {
    const currentTopPRs = issuesWithLabel(PRs, top_pull_request_label)
    const newTopPRs = getTopIssues(PRs, top_list_size)
    await labelTopIssues(
      owner,
      repo,
      currentTopPRs,
      newTopPRs,
      top_pull_request_label,
      top_pull_request_label_text,
      top_pull_request_label_colour
    )
  }
}

run()
