import {
    Stack,
    StackProps,
    SecretValue,
    pipelines,
    aws_codebuild as codebuild,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { stages } from '../../ii-app1-poc/infrastructure/lib/pipeline'

const APP_PATH = '../ii-app1-poc';

export class PipelineStack extends Stack {
    readonly PROJECT_NAME = 'app1-poc';

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const pipelineName = `${this.PROJECT_NAME}-Pipeline`;
        const pipeline = new pipelines.CodePipeline(this, pipelineName, {
            crossAccountKeys: true,
            dockerEnabledForSynth: true,
            pipelineName,
            synth: new pipelines.ShellStep('Synthesize', {
                additionalInputs: {
                    [APP_PATH]: pipelines.CodePipelineSource.gitHub(
                        'mbsoftworks/ii-app1-poc',
                        'main',
                        {
                            authentication: SecretValue.secretsManager('/ii-codepipeline-poc/github', {
                                jsonField: 'token'
                            })
                        }),
                },
                commands: [
                    `cd ${APP_PATH}/infrastructure/ && npm ci && cd -`,
                    'npm ci',
                    'npm run build',
                    'npm run cdk -- synth',
                ],
                input: pipelines.CodePipelineSource.gitHub(
                    'mbsoftworks/ii-codepipeline-poc',
                    'main',
                    {
                        authentication: SecretValue.secretsManager('/ii-codepipeline-poc/github', {
                            jsonField: 'token'
                        })
                    }),
            }),
            synthCodeBuildDefaults: {
                buildEnvironment: {
                    buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4,
                    computeType: codebuild.ComputeType.LARGE,
                },
            },
        });

        stages(pipeline).forEach((stage, _) => pipeline.addStage(stage));
    }
}
