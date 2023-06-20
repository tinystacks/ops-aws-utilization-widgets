// import React from "react";
// import { ChevronDownIcon } from "@chakra-ui/icons";
// import { Button, Menu, MenuButton, MenuItem, MenuList, Text } from "@chakra-ui/react";

// export function Selector (props: {
//   action: (...args: any[]) => void;
//   labelPrefix: string;
//   currentValue: string;
//   values: string[];
// }) {
//   const {
//     action,
//     labelPrefix,
//     currentValue,
//     values
//   } = props;

//   const 

//   return (
//     <Menu>
//       <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
//         <Text>
//           <Text fontWeight={'bold'}>{`${labelPrefix}`}</Text>
//           : {currentValue}
//         </Text>
//       </MenuButton>
//       <MenuList minW="0" w={250} h={40} sx={{ overflow:'scroll' }}>
//         {allAccountIds.map((accountId) => {
//           if (accountId === currentAccountId) {
//             return (
//               <MenuItem 
//                 command={'current'} 
//                 onClick={() => onAccountIdChange(accountId)}
//               >
//                 {accountId}
//               </MenuItem>
//             );
//           } else {
//             return <MenuItem onClick={() => onAccountIdChange(accountId)}>{accountId}</MenuItem>;
//           }
//         })}
//       </MenuList>
//     </Menu>
//   )

// }