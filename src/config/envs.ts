import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  DATABASE_URL: string;

  PRODUCTS_MS_PORT: number;
  PRODUCTS_MS_HOST: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    PRODUCTS_MS_PORT: joi.number().required(),
    PRODUCTS_MS_HOST: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  db: {
    url: envVars.DATABASE_URL,
  },
  services: {
    products: {
      host: envVars.PRODUCTS_MS_HOST,
      port: envVars.PRODUCTS_MS_PORT,
    },
  },
};
