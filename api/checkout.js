const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function checkoutRepos(repos, branch, repoDir, overwrite) {
  if (repos.length > 0 && !fs.existsSync(repoDir)) {
    console.log('Making repos dir', repoDir);
    fs.mkdirSync(repoDir);
  }

  repos
    .forEach(repo => {
      const repoPath = path.join(repoDir, repo);
      if (!fs.existsSync(repoPath)) {
        const remote = `https://github.com/RedHatInsights/${repo}`;
        console.log('cloning', branch, 'branch of', repo);
        execSync(`git clone --depth 1 --branch ${branch} ${remote}`, { cwd: repoDir });
      }
      else if (overwrite) {
        console.log('checking out', branch, 'branch of', repo);
        // User could potentially be offline
        try {
          execSync(`git fetch --depth 1 origin --force ${branch}:refs/remotes/origin/${branch}`, { cwd: repoPath });
        }
        catch (e) {
          console.error("Could not fetch remote, maybe you're offline?", e.toString());
        }
        try {
          execSync(`git checkout -B ${branch} origin/${branch}`, { cwd: repoPath });
        }
        catch (e) {
          console.error(`Could not checkout ${branch}, maybe you're offline and haven't fetched it before?`, e.toString());
        }
      }
      else {
        console.log('skipping', branch, 'branch of', repo, "since its user-managed. you'll have to checkout the correct code yourself");
      }
    });
}

module.exports = { checkoutRepos };
