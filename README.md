<p align="center">
  <a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

# 👍 Top Issues GitHub Action

A [GitHub Action](https://github.com/features/actions) that labels and displays the top-upvoted (i.e. 👍) issues and pull requests in your repository. It currently can:

-   Label top issues.
-   Label top bugs.
-   Label top feature requests.
-   Label top pull requests.
-   Display all of the above in a simple dashboard.

## Table of content

-   [Table of content](#table-of-content)
-   [Examples](#examples)
    -   [Top issues/bugs/feature request labels example](#top-issuesbugsfeature-request-labels-example)
    -   [Top pull request label example](#top-pull-request-label-example)
    -   [Top issues dashboard](#top-issues-dashboard)
-   [Usage](#usage)
    -   [Pre-requisites](#pre-requisites)
    -   [Inputs](#inputs)
    -   [Outputs](#outputs)
    -   [Examples workflow - Create Dashboard and label top issues, bugs, features and pull requests](#examples-workflow---create-dashboard-and-label-top-issues-bugs-features-and-pull-requests)
-   [Contributing](#contributing)

## Examples

### Top issues/bugs/feature request labels example

![image](https://user-images.githubusercontent.com/17570430/181007117-c0e6422a-90f6-4af4-a824-ae6e33dcfe95.png)

### Top pull request label example

![image](https://user-images.githubusercontent.com/17570430/181007179-5d949b9d-b4c6-4ec5-b3bd-552e0b56889f.png)

### Top issues dashboard

![image](https://user-images.githubusercontent.com/17570430/181007033-21b4d3c7-6d50-4d61-94e7-067db38d6838.png)

## Usage

### Pre-requisites

Create a workflow `.yml` file in your `.github/workflows` directory. An [example workflow](#examples-workflow---create-dashboard-and-label-top-issues-bugs-features-and-pull-requests) is available below. For more information, reference the GitHub Help Documentation for [creating a workflow file](https://docs.github.com/en/actions/using-workflows#creating-a-workflow-file).

### Inputs

Various inputs are defined in [action.yml](action.yml) to let you configure the action:

| Name                                 | Description                                                                                       | Default                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------- |
| `github_token`                       | Token used for authorizing interactions with the repository. Typically the `GITHUB_TOKEN` secret. | N/A                         |
| `top_list_size`                      | The number of top issues to show.                                                                 | `5`                         |
| `subtract_negative`                  | Subtract negative from positive reactions to get the total count.                                 | `true`                      |
| `dry_run`                            | Run the action without actually creating the labels and dashboard.                                | `false`                     |
| `label`                              | Label top issues.                                                                                 | `false`                     |
| `dashboard`                          | Create a dashboard that displays the top issues and pull requests.                                | `true`                      |
| `dashboard_title`                    | Dashboard title.                                                                                  | `Top Issues  Dashboard`     |
| `dashboard_label`                    | The label used for the top issues dashboard. title.                                               | :star: top issues dashboard |
| `dashboard_label_description`        | The description used for the top issues dashboard label.                                          | Top issues dashboard.       |
| `dashboard_label_colour`             | The colour used for the top issues dashboard label.                                               | `#EED801`                   |
| `dashboard_show_total_reactions`     | Display the total number of positive reactions after each dashboard item.                         | `false`                     |
| `hide_dashboard_footer`              | Hide dashboard footer.                                                                            | `false`                     |
| `top_issues`                         | Display top issues.                                                                               | `true`                      |
| `top_issue_label`                    | The label used for labelling  top issues.                                                         | :star: top issue            |
| `top_issue_label_description`        | The description used for the top issue label.                                                     | Top issue.                  |
| `top_issue_label_colour`             | The colour used for the top issue label.                                                          | `#027E9D`                   |
| `top_issue_label_description`        | The description used for the top issue label.                                                     | Top issue.                  |
| `top_bugs`                           | Display top bugs.                                                                                 | `false`                     |
| `bug_label`                          | The label that is used for bug issues.                                                            | `bug`                       |
| `top_bug_label`                      | The label used for labelling  top bugs.                                                           | :star: top bug              |
| `top_bug_label_description`          | The description used for the top bug label.                                                       | Top bug.                    |
| `top_bug_label_colour`               | The description used for the top bug label.                                                       | `#B60205`                   |
| `top_features`                       | Display top feature requests.                                                                     | `false`                     |
| `feature_label`                      | The label that is used for feature requests.                                                      | `enhancement`               |
| `top_feature_label`                  | The label used for labelling top feature request issues.                                          | :star: top feature          |
| `top_feature_label_description`      | The description used for the top feature request label.                                           | Top feature request         |
| `top_feature_label_colour`           | The colour used for the top feature request label.                                                | `#0E8A16`                   |
| `top_pull_requests`                  | Display top pull requests.                                                                        | `false`                     |
| `top_pull_requests_label`            | The label used for labelling  top pull request.                                                   | :star: top pull request     |
| `top_pull_request_label_description` | The description used for the top pull request label.                                              | Top pull request.           |
| `top_pull_request_label_colour`      | The colour used for the top pull request label.                                                   | `#41A285`                   |

### Outputs

This action currently does not have any outputs.

### Examples workflow - Create Dashboard and label top issues, bugs, features and pull requests

The following example uses the [schedule](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule) event to run the top-issues-action every day with all features enabled.

```yaml
name: Top issues action.
on:
  schedule:
  - cron:  '* * */1 * *'

jobs:
  showAndLabelTopIssues:
    name: Display and label top issues.
    runs-on: ubuntu-latest
    steps:
    - name: Run top issues action
      uses: rickstaa/top-issues-action@v1
      env:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        label: true
        dashboard: true
        top_issues: true
        top_bugs: true
        top_features: true
        top_pull_requests: true
```

## Contributing

Feel free to open an issue if you have ideas on how to make this GitHub action better or if you want to report a bug! All contributions are welcome. :rocket: Please consult the [contribution guidelines](CONTRIBUTING.md) for more information.
