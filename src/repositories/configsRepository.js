'use strict';

// TODO
function createConfigsRepository({ db }) {
  return {
    findById: (id) => db.find(config => config.id === id),
    create: (config) => db.push(config),
    update: async (id, config) => {
      const index = await db.findIndex(config => config.id === id);
      if (index !== -1) {
        db[index] = config;
      }
    },
    delete: async (id) => {
      const index = await db.findIndex(config => config.id === id);
      if (index !== -1) {
        db.splice(index, 1);
      }
    }
  };
}

export default createConfigsRepository;
