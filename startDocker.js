const { execSync } = require('child_process');
const { DOCKER_PREFIX, NET, getExposedPorts } = require('./services');

async function startService(name, args, dockerServices, dependsOn) {
  execSync(`docker container rm --force ${name}`);
  for (const dep of (dependsOn || [])) {
    const [group, service ] = dep.replace(DOCKER_PREFIX, '').split('_');
    const startMessage = dockerServices[group][service].startMessage;

    console.log('Waiting for', dep);
    while (!execSync(`docker logs ${dep} 2>&1`).toString().includes(startMessage)) {
      console.log('Waiting for', dep);
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  execSync(`docker run --name ${name} --network ${NET} --detach ${args}`);
}

async function startDocker(dockerServices) {
  execSync(`docker network inspect ${NET} >/dev/null 2>&1 || \
            docker network create  ${NET}`);
  for (let [serviceName, subServices] of Object.entries(dockerServices)) {
    for (let [subServiceName, { args, dependsOn }] of Object.entries(subServices)) {
      const containerName = `${DOCKER_PREFIX}${serviceName}_${subServiceName}`;
      await startService(containerName, args.filter(Boolean).join(' \\\n'), dockerServices, dependsOn)
      let ports = getExposedPorts(args);
      if (ports && ports.length === 1) {
        ports = ports[0];
      }
      console.log("Container", containerName, "listening", ports ? 'on' : '', ports || '');
    }
  }
}

module.exports = {
  startDocker
};

