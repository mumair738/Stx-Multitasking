'use client';

import {
  makeContractCall,
  makeContractSTXPostCondition,
  FungibleConditionCode,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  stringUtf8CV,
  uintCV,
  principalCV,
  listCV,
  stringAsciiCV,
  cvToJSON,
  cvToValue,
  serializeCV,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';

// Configure network - using string-based network config
const network = {
  coreApiUrl: 'https://api.testnet.hiro.so',
  chainId: 2147483648, // Testnet chain ID
};

// Helper function to call read-only contract functions via API
async function callReadOnlyFunction(options: {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: any[];
  senderAddress: string;
}) {
  const { contractAddress, contractName, functionName, functionArgs, senderAddress } = options;
  
  const args = functionArgs.map((arg) => `0x${serializeCV(arg).toString('hex')}`);
  
  const response = await fetch(
    `${network.coreApiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderAddress,
        arguments: args,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to call read-only function: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export const POAP_CONTRACT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.poap';
export const VOTING_CONTRACT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.voting';

// POAP Contract Functions
export async function mintPOAP(
  recipient: string,
  eventName: string,
  eventDate: number,
  imageUri: string,
  senderKey: string
) {
  const [contractAddress, contractName] = POAP_CONTRACT.split('.');
  
  const functionArgs = [
    principalCV(recipient),
    stringAsciiCV(eventName),
    uintCV(eventDate),
    stringAsciiCV(imageUri),
  ];

  const txOptions = {
    contractAddress,
    contractName,
    functionName: 'mint-poap',
    functionArgs,
    senderKey,
    validateWithAbi: false,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await makeContractCall(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  return broadcastResponse;
}

export async function mintPOAPWithWallet(
  recipient: string,
  eventName: string,
  eventDate: number,
  imageUri: string
) {
  const [contractAddress, contractName] = POAP_CONTRACT.split('.');
  
  const functionArgs = [
    principalCV(recipient),
    stringAsciiCV(eventName),
    uintCV(eventDate),
    stringAsciiCV(imageUri),
  ];

  await openContractCall({
    contractAddress,
    contractName,
    functionName: 'mint-poap',
    functionArgs,
    network,
    anchorMode: AnchorMode.Any,
  });
}

export async function checkPOAPOwnership(userAddress: string): Promise<boolean> {
  const [contractAddress, contractName] = POAP_CONTRACT.split('.');
  
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: 'has-poap',
      functionArgs: [principalCV(userAddress)],
      senderAddress: userAddress,
    });
    
    // Parse the result - it should be a boolean clarity value
    return result.okay && result.result?.repr === 'true';
  } catch (error) {
    console.error('[v0] Error checking POAP ownership:', error);
    return false;
  }
}

export async function getPOAPBalance(userAddress: string): Promise<number> {
  const [contractAddress, contractName] = POAP_CONTRACT.split('.');
  
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: 'get-balance',
      functionArgs: [principalCV(userAddress)],
      senderAddress: userAddress,
    });
    
    // Parse uint from result
    const match = result.result?.repr?.match(/u(\d+)/);
    return match ? parseInt(match[1]) : 0;
  } catch (error) {
    console.error('[v0] Error getting POAP balance:', error);
    return 0;
  }
}

// Voting Contract Functions
export async function createProposal(
  title: string,
  description: string,
  durationBlocks: number,
  options: string[]
) {
  const [contractAddress, contractName] = VOTING_CONTRACT.split('.');
  
  const optionsCVs = options.map(opt => stringUtf8CV(opt));
  
  await openContractCall({
    contractAddress,
    contractName,
    functionName: 'create-proposal',
    functionArgs: [
      stringUtf8CV(title),
      stringUtf8CV(description),
      uintCV(durationBlocks),
      listCV(optionsCVs),
    ],
    network,
    anchorMode: AnchorMode.Any,
  });
}

export async function castVote(proposalId: number, optionId: number) {
  const [contractAddress, contractName] = VOTING_CONTRACT.split('.');
  
  await openContractCall({
    contractAddress,
    contractName,
    functionName: 'cast-vote',
    functionArgs: [uintCV(proposalId), uintCV(optionId)],
    network,
    anchorMode: AnchorMode.Any,
  });
}

export async function getProposal(proposalId: number) {
  const [contractAddress, contractName] = VOTING_CONTRACT.split('.');
  
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: 'get-proposal',
      functionArgs: [uintCV(proposalId)],
      senderAddress: contractAddress,
    });
    
    return result;
  } catch (error) {
    console.error('[v0] Error getting proposal:', error);
    return null;
  }
}

export async function getProposalOption(proposalId: number, optionId: number) {
  const [contractAddress, contractName] = VOTING_CONTRACT.split('.');
  
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: 'get-proposal-option',
      functionArgs: [uintCV(proposalId), uintCV(optionId)],
      senderAddress: contractAddress,
    });
    
    return result;
  } catch (error) {
    console.error('[v0] Error getting proposal option:', error);
    return null;
  }
}

export async function hasVoted(proposalId: number, voterAddress: string): Promise<boolean> {
  const [contractAddress, contractName] = VOTING_CONTRACT.split('.');
  
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: 'has-voted',
      functionArgs: [uintCV(proposalId), principalCV(voterAddress)],
      senderAddress: voterAddress,
    });
    
    return result.okay && result.result?.repr === 'true';
  } catch (error) {
    console.error('[v0] Error checking vote status:', error);
    return false;
  }
}

export async function getWinningOption(proposalId: number): Promise<number> {
  const [contractAddress, contractName] = VOTING_CONTRACT.split('.');
  
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: 'get-winning-option',
      functionArgs: [uintCV(proposalId)],
      senderAddress: contractAddress,
    });
    
    // Parse uint from result
    const match = result.result?.repr?.match(/u(\d+)/);
    return match ? parseInt(match[1]) : 0;
  } catch (error) {
    console.error('[v0] Error getting winning option:', error);
    return 0;
  }
}
