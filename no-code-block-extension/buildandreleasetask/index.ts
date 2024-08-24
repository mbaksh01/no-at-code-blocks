import * as fs from 'fs';
import * as path from 'path';
import * as azdev from "azure-devops-node-api";
import tl = require('azure-pipelines-task-lib/task');
import { GitPullRequestStatus, GitStatusState } from 'azure-devops-node-api/interfaces/GitInterfaces';

async function run() {
    try {
        const directoryToSearch: string = tl.getInput('blazorprojectpath', true)!;

        await setPullRequestStatus(GitStatusState.Pending, "Checkig for @code blocks in razor files.");

        const fileFilter = /\.razor$/; // Example filter: search for TypeScript files

        const foundFiles = searchDirectory(directoryToSearch, fileFilter);
        console.log('Found files:', foundFiles);

        if (searchFilesForCode(foundFiles, "@code")) {
            await setPullRequestStatus(GitStatusState.Failed, "Found @code blocks in razor files.");
            tl.setResult(tl.TaskResult.Failed, "@code blocks were found in razor files.");
        } else {
            await setPullRequestStatus(GitStatusState.Succeeded, "No @code blocks found in any razor files.");
            tl.setResult(tl.TaskResult.Succeeded);
        }
    } catch (err: any) {
        await setPullRequestStatus(GitStatusState.Error, "An unhandled error occurred when searching for @code blocks.");
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

function searchDirectory(dir: string, filter: RegExp, results: string[] = []): string[] {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            searchDirectory(filePath, filter, results);
        } else if (filter.test(file)) {
            results.push(filePath);
        }
    }

    return results;
}

function searchFilesForCode(files: string[], searchTerm: string): Boolean {
    let searchTermFound = false;

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes(searchTerm)) {
            console.log(`Found "${searchTerm}" in file: ${file}`);
            searchTermFound = true;
        }
    });

    return searchTermFound;
}

async function setPullRequestStatus(statusState: GitStatusState, statusDescription: string) {
    let token = tl.getEndpointAuthorizationParameter('SystemVssConnection', 'AccessToken', false);
    let repoId = tl.getVariable('Build.Repository.ID');
    let pullRequestId = tl.getVariable('System.PullRequest.PullRequestId');
    let collectionURL = tl.getVariable('System.CollectionUri');

    if (token === undefined) {
        console.warn("Could not get system access token. Not posting pull request status.");
        return;
    }

    if (repoId === undefined) {
        console.warn("Could not get repository id. Not posting pull request status.");
        return;
    }

    if (pullRequestId === undefined) {
        console.warn("Could not get pull request id. Not posting pull request status.");
        return;
    }

    if (collectionURL === undefined) {
        console.warn("Could not get collection URL. Not posting pull request status.");
        return;
    }

    let pullRequestNumber = parseInt(pullRequestId);

    let prStatus: GitPullRequestStatus = {
        state: statusState,
        description: statusDescription,
        context: {
            name: "no-code-block-policy",
            genre: "bqc",
        },
        iterationId: 1
    };

    let authHandler = azdev.getPersonalAccessTokenHandler(token);
    let connection = new azdev.WebApi(collectionURL, authHandler);

    try {
        let vstsGit = await connection.getGitApi();
        
        try {
            let iterations = await vstsGit.getPullRequestIterations(repoId, pullRequestNumber);
    
            prStatus.iterationId = iterations.length;
        } catch (error) {
            console.error(error);
        }

        await vstsGit.createPullRequestStatus(prStatus, repoId, pullRequestNumber);
    } catch (error) {
        console.error(error);
    }
}

run();