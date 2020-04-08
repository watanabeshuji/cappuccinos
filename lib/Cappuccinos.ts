import * as AWS from 'aws-sdk';
import { Layers } from './Layers';
import { Functions } from './Functions';
import { Apis } from './Apis';
import { AwsConfig } from './types';
import * as utils from './utils';
import { green } from 'colorette';

export const newLayers = async (env: string, options: any, logger: any): Promise<Layers> => {
    const cap = new Cappuccinos(env, options, logger);
    const awsConfig = await cap.initAwsSdk();
    const config = await cap.loadProjectConfig(awsConfig);
    return new Layers(env, options, logger, config);
}

export const newFunctions = async (env: string, options: any, logger: any): Promise<Functions> => {
    const cap = new Cappuccinos(env, options, logger);
    const awsConfig = await cap.initAwsSdk();
    const config = await cap.loadProjectConfig(awsConfig);
    return new Functions(env, options, logger, config, awsConfig);
}

export const newApis = async (env: string, options: any, logger: any): Promise<Apis> => {
    const cap = new Cappuccinos(env, options, logger);
    const awsConfig = await cap.initAwsSdk();
    const config = await cap.loadProjectConfig(awsConfig);
    return new Apis(env, options, logger, config, awsConfig);
}

class Cappuccinos {
    env: string;
    options: any;
    logger: any;

    constructor(env: string, options: any, logger: any) {        
        this.logger = logger;
        this.env = env;
        this.options = options;
    }

    async loadProjectConfig(awsConfig: AwsConfig) {
        this.logger.debug(`[Load] project.yaml`);
        this.logger.info(`ENV: ${green(this.env)}`);
        const config = await utils.loadProjectConfig(this.env, awsConfig);
        this.logger.debug(JSON.stringify(config, null, 2));
        return config;
    }

    async initAwsSdk(): Promise<AwsConfig> {
        const awsConfig = await utils.getAwsConfig(this.env);
        if (!this.options.ignoreProfile && awsConfig && awsConfig.aws_profile) {
            this.logger.info(`AWS_PROFILE: ${green(awsConfig.aws_profile)}`);
            AWS.config.credentials = new AWS.SharedIniFileCredentials({
                profile: awsConfig.aws_profile
            });
        }
        AWS.config.update({
            maxRetries: 15,
            retryDelayOptions: {
                customBackoff: retryCount => (Math.random() * 700 + 300)
            }
        });
        const region = AWS.config.region || '';
        if (awsConfig) {
            this.logger.info(`AWS_ACCOUNT_ID: ${green(awsConfig.account_id)}`);
            this.logger.info(`REGION: ${green(region)}`);
            return awsConfig;
        } else {
            const accountId = await this.getAccountId();
            this.logger.info(`AWS_ACCOUNT_ID: ${green(accountId)}`);
            this.logger.info(`REGION: ${green(region)}`);
            return {
                account_id: accountId
            };    
        }
    }

    async getAccountId() {
        const accountId = await (async () => {
            const ret = await new AWS.STS().getCallerIdentity({}).promise();
            this.logger.debug(JSON.stringify(ret, null, 2));
            if (ret.Account === undefined) throw new Error('AccountId is unknown.');
            return ret.Account;
        })();
        return accountId;
    }
}