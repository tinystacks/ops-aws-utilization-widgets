<p align="center">
  <img width="2051" alt="docs-thumbnail" src="https://github.com/tinystacks/ops-aws-utilization-widgets/assets/6458766/bbf70c7b-cd53-4456-88a4-c7bb046d67a2">
</p>

<p align="center">
  <a href='http://makeapullrequest.com'><img alt='PRs Welcome' src='https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=shields'/></a>
  <a href='https://discord.gg/AZZzdGVCNW'><img alt="Join Discord Community" src="https://img.shields.io/badge/discord%20community-join-blue"/></a>
</p>

# Aws Utilization

Aws Utilization is a developer's ultimate cost-saving companion on AWS. This suite of visual workflows is the most convenient way to identify resources ready for optimization.

The main features are

- [Summarize Resource Utilization](#summarize-resource-utilization)
- [Delete or scale down individual resources](#delete-scale-down-optimize)
- Explore service and resource level costs over time (Coming soon!)
- [View cost alongside key metrics and settings](#console)

The parent project can be found [here](https://github.com/tinystacks/opsconsole).

Table of Contents
-----------------
- [Features](#features)
- [Installation and Usage](#installation-and-usage)
- [Technical Specs](#technical-specs)
- [Contributing](#contributing)

## Features

### Summarize Resource Utilization

Automatically identify underused resources and generate recommendations for them.

![summary](https://github.com/tinystacks/ops-aws-utilization-widgets/assets/6458766/1a3f61e5-2d78-4710-9550-5beb4ec15124)


### Delete, Scale Down, Optimize
View which resources can be cost optimized and review specific metrics for each. Accept recommendations and delete or scale down your resource, or turn on cost optimizing features.

![image](https://github.com/tinystacks/ops-aws-utilization-widgets/assets/6458766/71a3b685-2367-4203-8d81-165d7e9434db)

![image](https://github.com/tinystacks/ops-aws-utilization-widgets/assets/6458766/2e793503-00a4-4ae9-a25e-7c67cf68abb2)

### Console
This featureset is part of the open source [OpsConsole project](https://github.com/tinystacks/opsconsole/tree/main), which brings cost, configuration, and metrics across your cloud to a centralized console.

![image](https://github.com/tinystacks/ops-aws-utilization-widgets/assets/6458766/92833653-4681-49af-a5e5-2ec1db525479)

## Installation and Usage

```bash
# PREREQ: Have docker installed and running

# install the opsconsole framework package
npm i -g opsconsole;

# download the template for AWS Utilization and Cost
curl https://raw.githubusercontent.com/tinystacks/opsconsole/main/samples/aws-sample.yml -o config-template.yml;

# Initialize a config file from the template
opsconsole init -t config-template.yml;

# start the console
opsconsole up -c config.yml;
```

### Development
advanced installation and development instructions can be found in [DEVELOPMENT.md](/DEVELOPMENT.md).


## Contributing

Contributions to `ops-aws-utilization-widgets` and the `@tinystacks/opsconsole` project are welcome! If you find any issues, have suggestions for improvements, or would like to contribute new features, please feel free to submit a pull request.

Make sure to familiarize yourself with the project's [contribution guidelines](CONTRIBUTING.md) before getting started.
