# No @code block

Checks all .razor files in a given folder for the presents of the `@code` block. If the `@code` block is found in any file then this task will fail.

```yaml
- task: NoAtCodeBlock@0
  displayName: Blazor Quality Checks
  inputs:
    blazorprojectpath: "$(System.DefaultWorkingDirectory)/MyBlazorProject"
```

## Enabling Custom Pull Request Statuses

1. Enable `continueOnError` as part of the build step.
2. Run the pipeline once as part of a PR for the status to be posted to Azure DevOps.
3. Navigate to Status Checks for your repository.
4. Click + and add the `bqc/no-code-block-policy`.
5. Save the changes.

![No Code Block custom Azure DevOps Status](https://github.com/mbaksh01/no-at-code-blocks/blob/main/no-code-block-extension/images/custom-status-no-code-block.png)
