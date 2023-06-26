## Advanced installation
To incorporate `ops-aws-utilization-widgets` into your project, follow these steps:

1. Clone this repository:

   ```
   git clone https://github.com/tinystacks/ops-aws-utilization-widgets.git
   ```

2. Install the dependencies using npm:

   ```
   npm install
   ```

3. Build the package:

   ```
   npm run build
   ```

4. Use the generated build artifacts in your application.


### Usage

To integrate the `ops-aws-utilization-widgets` package into your project, refer to the documentation and examples provided in the `@tinystacks/opsconsole` project. The documentation will guide you through the integration process and demonstrate how to leverage the capabilities of the package effectively.

### Key Components

#### AWS Utilization Summary Widget
This widget displays key information about unoptimized AWS resource utilization. You can find the implementation of this widget in the [aws-utilization.tsx](src/widgets/aws-utilization.tsx) file.

#### AWS Resource Utilization Recommendations Widget
This widget offers a set of tools and features that allow you to interact with AWS resources. It provides a user-friendly interface to adjust configurations, scale resources down, and close resources out entirely. You can find the implementation of this widget in the [aws-utilization-recommendations](src/widgets/aws-utilization-recommendations.tsx) file.

#### Aws Utilization Provider
The provider included in this package is responsible for gathering information about how much AWS resources are costing users. It facilitates actions to optimize resource utilization and provides valuable insights into cost allocation. You can find the implementation of this provider in the [aws-utilization-provider.ts](src/aws-utilization-provider.ts) file.