require('dotenv').config()
const Agenda = require('agenda');

const agenda = new Agenda({db: {address: process.env.MONGODB_URI, collection: 'agenda'}});
const {Light, initDb} = require('./util/db.js');
const host = process.env.HUE_BRIDGE_IP, username = process.env.HUE_USERNAME;
const HueApi = require("node-hue-api").HueApi(host, username);
const updateLightsState = 'update lights state';
// HueApi.lights.then(displayResult).done();

initDb();

agenda.define(updateLightsState, (job, done) => {

  HueApi.lights().then(async ({lights}) => {

    await Promise.all(lights.map(async (currentLightInstance) => {
      const previousLightInstanceQuery = await Light.find({id: currentLightInstance.id});
      let previousLightInstance = previousLightInstanceQuery[0];
      const lightParams = {
        id: currentLightInstance.id,
        state: currentLightInstance.state,
        name: currentLightInstance.name
      };

      if (previousLightInstance) {
        const previousState = previousLightInstance.get('state');
        if (!previousState.reachable && currentLightInstance.state.reachable) {
          const newLightParams = lightParams;
          newLightParams.state = previousState;
          newLightParams.state.reachable = true;
          previousLightInstance.set(newLightParams);
          HueApi.setLightState(currentLightInstance.id, previousState);
        } else {
          previousLightInstance.set(lightParams);
        }
      } else {
        previousLightInstance = new Light(lightParams);
      }
      await previousLightInstance.save();
    }))


    done();
  })
});


agenda.on('ready', () => {
  agenda.every('1 second', updateLightsState);
  agenda.start();
});

function graceful() {
  agenda.stop(function () {
    process.exit(0);
  });
}

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);