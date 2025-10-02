import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Configure Aptos SDK for Movement Network
const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://full.mainnet.movementinfra.xyz/v1",
  chainId: 126, // Movement Mainnet chain ID
});

const aptos = new Aptos(config);

export async function buildMovementTransferRaw(
  senderAddress: string,
  receiverAddress: string,
  amount: number
): Promise<string> {
  try {
    // Create a simple coin transfer transaction
    const transaction = await aptos.transaction.build.simple({
      sender: senderAddress,
      data: {
        function: "0x1::coin::transfer",
        typeArguments: ["0x1::aptos_coin::AptosCoin"],
        functionArguments: [receiverAddress, amount],
      },
    });

    // Get the raw transaction bytes - try different API methods
    let rawTransaction;
    try {
      // Try the rawTransaction method
      rawTransaction = await aptos.transaction.build.rawTransaction({
        sender: senderAddress,
        data: {
          function: "0x1::coin::transfer",
          typeArguments: ["0x1::aptos_coin::AptosCoin"],
          functionArguments: [receiverAddress, amount],
        },
      });
    } catch (e) {
      // Fallback to simple transaction and serialize it
      rawTransaction = await aptos.transaction.build.simple({
        sender: senderAddress,
        data: {
          function: "0x1::coin::transfer",
          typeArguments: ["0x1::aptos_coin::AptosCoin"],
          functionArguments: [receiverAddress, amount],
        },
      });
    }

    // Convert to hex string
    const rawHex = Buffer.from(rawTransaction).toString('hex');
    return `0x${rawHex}`;
  } catch (error) {
    console.error('Error building Movement transfer raw transaction:', error);
    throw error;
  }
}

export async function buildMovementRawTransaction(
  senderAddress: string,
  functionName: string,
  typeArguments: string[],
  functionArguments: any[]
): Promise<string> {
  try {
    // Create a raw transaction
    const rawTransaction = await aptos.transaction.build.rawTransaction({
      sender: senderAddress,
      data: {
        function: functionName,
        typeArguments,
        functionArguments,
      },
    });

    // Convert to hex string
    const rawHex = Buffer.from(rawTransaction).toString('hex');
    return `0x${rawHex}`;
  } catch (error) {
    console.error('Error building Movement raw transaction:', error);
    throw error;
  }
}
