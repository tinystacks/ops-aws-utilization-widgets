import {
  Box,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs
} from '@chakra-ui/react';
import { Line } from 'react-chartjs-2';
import React from 'react';
import { Metrics, Metric } from '../../types/types';
import isEmpty from 'lodash.isempty';
import {
  TooltipItem, TooltipModel
} from 'chart.js';
import get from 'lodash.get';


export default function SidePanelMetrics (props: { 
  metrics: Metrics
}) {


  const { metrics } = props; 
  console.log('metrics: ', metrics);

  if(isEmpty(metrics)){ 
    return null;
  }

  const tabListDom = Object.keys(metrics).map( metric => ( 
    <Tab>{metrics[metric]?.yAxisLabel}</Tab>
  ));

  const tabPanelsDom = Object.keys(metrics).map( (metric) => { 
    const metricData: Metric = metrics[metric];
    if(isEmpty(metricData)){ 
      return null;
    }


    const dataSet = { 
      label: metricData.yAxisLabel, 
      data: metricData.values.map(d => ({ 
        x: d.timestamp, 
        y: d.value
      })),
      borderColor: '#ED8936'
    };

    return (
      <TabPanel>
        <Line
          datasetIdKey='label'
          data = {{
            datasets: [dataSet]
          }}
          options={{
            scales: {
              x: {
                type: 'linear',
                grace: '5%', 
                ticks: {
                  callback: function (label) {
                    return new Date(label).toLocaleString();
                  }
                }
              },
              y: {
                type: 'linear',
                grace: '5%'
              }
            },
            hover: {
              mode: 'index',
              intersect: false
            },
            plugins: {
              colors: {
                enabled: true
              },
              legend: {
                display: true,
                position: 'bottom'
              }, 
              title: { 
                display: true,
                text: metricData.yAxisLabel
              }, 
              tooltip: {
                callbacks: {
                  title: function (this: TooltipModel<'line'>, items: TooltipItem<'line'>[]) {
                    return items.map(i => new Date(get(i.raw, 'x')).toLocaleString());
                  },
                  label: function (this: TooltipModel<'line'>, item: TooltipItem<'line'>) {
                    const datasetLabel = item.dataset.label || '';
                    const dataPoint = item.formattedValue;
                    return datasetLabel + ': ' + dataPoint;
                  }
                }
              }
            }, 
            interaction: 
        {   
          mode: 'index',
          intersect: false
        }
          }}
        /> 
      </TabPanel>
    );

  });

  return (
    <Stack w='100%'>
      <Box>
        <Tabs size='md' variant='enclosed'>
          <TabList>
            {tabListDom}
          </TabList>
          <TabPanels>
            {tabPanelsDom}
          </TabPanels>
        </Tabs>
      </Box>
    </Stack>
  );
}