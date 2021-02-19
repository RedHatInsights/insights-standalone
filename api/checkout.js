const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function checkoutRepos(repos, env, repoDir) {
  if (repos.length > 0 && !fs.existsSync(repoDir)) {
    console.log('Using repos dir', repoDir);
    fs.mkdirSync(repoDir);
  }

  repos
    .forEach(repo => {
      const repoPath = path.join(repoDir, repo);
      console.log('checking out', env, 'branch of', repo);
      if (!fs.existsSync(repoPath)) {
        const remote = `https://github.com/RedHatInsights/${repo}`;
        execSync(`git clone --depth 1 --branch ${env} ${remote}`, { cwd: repoDir });
      }
      else {
        // User could potentially be offline
        try {
          execSync(`git fetch --depth 1 origin --force ${env}:refs/remotes/origin/${env}`, { cwd: repoPath });
        }
        catch (e) {
          console.error("Could not fetch remote, maybe you're offline?", e.toString());
        }
        try {
          execSync(`git checkout -B ${env} origin/${env}`, { cwd: repoPath });
        }
        catch (e) {
          console.error(`Could not checkout ${env}, maybe you're offline and haven't fetched it before?`, e.toString());
        }
      }
    });
}

module.exports = { checkoutRepos };
