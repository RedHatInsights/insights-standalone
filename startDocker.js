const { execSync } = require('child_process');
const { NET, getExposedPort } = require('./helpers');

async function startService(name, args, backend, dependsOn) {
  execSync(`docker container rm --force ${name}`);
  for (const dep of (dependsOn || [])) {
    const [group, service ] = dep.split('_');
    const startMessage = backend[group][service].startMessage;

    console.log('Waiting for', dep);
    while (!execSync(`docker logs ${dep} 2>&1`).toString().includes(startMessage)) {
      console.log('Waiting for', dep);
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  execSync(`docker run --name ${name} --network ${NET} --detach --pull always ${args}`);
}

async function startDocker(backend) {
  execSync(`docker network inspect ${NET} >/dev/null 2>&1 || \
            docker network create  ${NET}`);
  for (let [serviceName, subServices] of Object.entries(backend)) {
    if (!subServices) {
      continue;
    }
    for (let [subServiceName, subServiceProps] of Object.entries(subServices)) {
      if (!subServiceProps) {
        continue;
      }
      const { args, dependsOn } = subServiceProps;
      if (Array.isArray(args)) {
        const containerName = [serviceName, subServiceName].join('_');

        const formattedArgs = args
          .filter(Boolean)
          .map(arg => {
            if (typeof arg === 'function') {
              if (subServices.assets) {
                return arg(subServices.assets);
              }
            }
            else if (typeof arg === 'string') {
              return arg;
            }
            else {
              throw Error(`Arg is a function but there's no assets: ${arg}`);
            }
          })
          .join(' \\\n');
        await startService(containerName, formattedArgs, backend, dependsOn)
        const port = getExposedPort(args);
        console.log("Container", containerName, "listening", port ? 'on' : '', port || '');
      }
    }
  }
}

module.exports = {
  startDocker
};

