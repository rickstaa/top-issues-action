/**
 * @file Global action types.
 */

/**
 * Issue object returned by GraphQL.
 */
export interface IssueNode {
  number: number
  title: string
  positive: {totalCount: number}
  negative: {totalCount: number}
  labels: {nodes: {name: string}[]}
}

/**
 * Issue object with additional totalReactions property.
 */
export interface TopIssueNode extends IssueNode {
  totalReactions: number
}
