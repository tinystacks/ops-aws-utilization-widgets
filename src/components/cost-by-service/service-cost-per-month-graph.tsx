import React from 'react';
import { Line } from 'react-chartjs-2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import palette from 'google-palette';
import { ServiceCostsPerMonth } from '../../types/cost-and-usage-types';

export function ServiceCostPerMonthGraph (props: {  
  serviceCostsPerMonth: ServiceCostsPerMonth,
  monthLabels: string[] 
}) {

  const { 
    serviceCostsPerMonth,
    monthLabels
  } = props;

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const
      },
      title: {
        display: true,
        text: 'AWS Service Costs per Month'
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function (value: any) {
            return '$' + value;
          }
        }
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 10
      }
    }
  };

  const colors = (palette('mpn65', Object.keys(serviceCostsPerMonth).length) as string[]).map(hex => '#' + hex);

  const sortedServices = Object.keys(serviceCostsPerMonth).sort((a, b) => {
    return serviceCostsPerMonth[b].at(-1) - serviceCostsPerMonth[a].at(-1);
  });

  const datasets = sortedServices.map((service, index) => {
    return {
      label: service,
      data: serviceCostsPerMonth[service],
      borderColor: colors[index],
      backgroundColor: colors[index],
      ...(index > 4 && { hidden: true })
    };
  });

  const data  = {
    labels: monthLabels,
    datasets
  };

  return <Line options={options} data={data}/>;
}