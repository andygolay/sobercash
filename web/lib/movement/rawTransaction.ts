import { Aptos, AptosConfig, Network, Serializer } from '@aptos-labs/ts-sdk';
import { Buffer } from 'buffer';

export async function buildMovementTransferRaw(
  sender: string,
  receiver: string,
  amountOctas: number,
): Promise<string> {
  const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: 'https://full.mainnet.movementinfra.xyz/v1',
  });
  const aptos = new Aptos(config);

  // Get account info to ensure proper sequence number
  try {
    const accountInfo = await aptos.account.getAccountInfo({ accountAddress: sender });
    console.log('Account sequence number:', accountInfo.sequence_number);
  } catch (e) {
    console.warn('Failed to get account info:', e);
  }

  const tx = await aptos.transaction.build.simple({
    sender,
    data: {
      function: '0x1::aptos_account::transfer_coins',
      typeArguments: ['0x1::aptos_coin::AptosCoin'],
      functionArguments: [receiver, amountOctas],
    },
  });

  console.log('Built transaction:', {
    sender: tx.rawTransaction.sender,
    sequenceNumber: tx.rawTransaction.sequence_number,
    gasUnitPrice: tx.rawTransaction.gas_unit_price,
    maxGasAmount: tx.rawTransaction.max_gas_amount,
  });

  const s = new Serializer();
  tx.rawTransaction.serialize(s);
  const rawHex = Buffer.from(s.toUint8Array()).toString('hex');
  return rawHex;
}

export async function buildMovementRawTransaction(
  senderAddress: string,
  functionName: string,
  typeArguments: string[],
  functionArguments: any[]
): Promise<string> {
  const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: 'https://full.mainnet.movementinfra.xyz/v1',
  });
  const aptos = new Aptos(config);

  try {
    const transaction = await aptos.transaction.build.simple({
      sender: senderAddress,
      data: {
        function: functionName as `${string}::${string}::${string}`,
        typeArguments,
        functionArguments,
      },
    });

    const serializer = new Serializer();
    transaction.rawTransaction.serialize(serializer);
    const rawHex = Buffer.from(serializer.toUint8Array()).toString('hex');
    return rawHex;
  } catch (error) {
    console.error('Error building Movement raw transaction:', error);
    throw error;
  }
}
