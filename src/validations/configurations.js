import Joi from 'joi';

const updateConfiguration = Joi.object({
    name: Joi.string(),
    hash: Joi.string(),
    fromAddress: Joi.string(),
    toAddress: Joi.string(),
    minValue: Joi.string().min(0),
    maxValue: Joi.string().min(0),
    minBlockNumber: Joi.number().min(0),
    maxBlockNumber: Joi.number().min(0),
    minIndex: Joi.number().min(0),
    maxIndex: Joi.number().min(0),
    type: Joi.number().min(0),
    active: Joi.boolean().strict(),
    blockDelay: Joi.number().min(0),
});

const createConfiguration = Joi.object({
    name: Joi.string().required(),
    hash: Joi.string(),
    fromAddress: Joi.string(),
    toAddress: Joi.string(),
    minValue: Joi.string(),
    maxValue: Joi.string(),
    minBlockNumber: Joi.number().min(0),
    maxBlockNumber: Joi.number().min(0),
    minIndex: Joi.number().min(0),
    maxIndex: Joi.number().min(0),
    type: Joi.number().min(0),
    active: Joi.boolean().default(false),
    blockDelay: Joi.number().min(0),
});

const configSchema = {
    updateConfiguration,
    createConfiguration,
};

export default configSchema;
