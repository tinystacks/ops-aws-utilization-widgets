import React from 'react';
import { Heading, Stack, Table, TableContainer, Tbody, Th, Thead } from '@chakra-ui/react';
import isEmpty from 'lodash.isempty';
import { CostReport } from '../../types/cost-and-usage-types.js';
import ServiceRow from './service-row.js';

export default function ReportBreakdown (
  props: { costReport: CostReport }
) {
  const { costReport } = props;

  function serviceRow (service: string) {
    return (
      <ServiceRow
        service={service}
        serviceInformation={costReport.report[service]}
      />
    );
  }

  function reportTable () {
    // const [ sorting, setSorting ] = React.useState<SortingState>([]);
    // const table = useReactTable({

    // })

    if (isEmpty(costReport.report) && costReport.hasCostReportDefinition) {
      return (
        <Heading pt={2} pl={6} size='xs'>
          No cost report available! 
          If you have recently created an AWS Cost and Usage Report, it will be available in 24 hours.
        </Heading>
      );
    } else if (!costReport.hasCostReportDefinition) {
      return (
        <Heading pt={2} pl={6} size='xs'>
          You need to set up an AWS Cost and Usage Report under Billing in the AWS Console.
          It only takes a couple minutes, and a report will be available in 24 hours!
        </Heading>
      );
    }
    return (
      <Stack>
        <Heading pt={2} pl={6} size='xs'>
          All cost values are monthly estimates based on current usage costs provided by AWS
        </Heading>
        <TableContainer border="1px" borderColor="gray.100">
          <Table variant="simple">
            <Thead bgColor="gray.50">
              <Th>Service</Th>
              <Th># Resources</Th>
              <Th>Cost/Mo</Th>
              <Th/>
            </Thead>
            <Tbody>
              {Object.keys(costReport.report).sort().map(serviceRow)}
            </Tbody>
          </Table>
        </TableContainer>
      </Stack>
    );
  }

  return (
    <Stack pb='2' w="100%">
      {reportTable()}
    </Stack>
  );
}