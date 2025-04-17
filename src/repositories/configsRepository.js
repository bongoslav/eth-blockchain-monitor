'use strict';

function createConfigsRepository({ ConfigModel }) {
  if (!ConfigModel) {
    throw new Error('ConfigModel is required to create configs repository');
  }

  async function findById(id) {
    return await ConfigModel.findByPk(id);
  }

  async function create(configData) {
    return await ConfigModel.create(configData);
  }

  async function update(id, configData) {
    // Returns [affectedCount]
    const [affectedCount] = await ConfigModel.update(configData, {
      where: { id },
    });
    return affectedCount;
  }

  async function deleteById(id) {
    return await ConfigModel.destroy({
      where: { id },
    });
  }

  return {
    findById,
    create,
    update,
    deleteById,
  };
}

export default createConfigsRepository;
