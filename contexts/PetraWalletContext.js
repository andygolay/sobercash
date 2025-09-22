import { Buffer } from 'buffer';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import nacl from 'tweetnacl';

const PetraWalletContext = createContext();

export const usePetraWallet = () => {
  const context = useContext(PetraWalletContext);
  if (!context) {
    throw new Error('usePetraWallet must be used within a PetraWalletProvider');
  }
  return context;
};

// Constants from official example
const APP_INFO = {
  domain: 'https://sobercash.app',
  name: 'SoberCash',
};

// For Expo Go, use the actual Expo URL
const DAPP_LINK_BASE = 'exp://vunyv2o-anonymous-8081.exp.direct/--/sobercash';
const PETRA_LINK_BASE = 'petra:///api/v1';

export const PetraWalletProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Key management - exactly like official example
  const [secretKey, setSecretKey] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [sharedPublicKey, setSharedPublicKey] = useState(null);

  // Success message state
  const [pendingSuccessMessage, setPendingSuccessMessage] = useState(null);

  // Generate key pair - exactly like official example
  const generateAndSaveKeyPair = () => {
    const keyPair = nacl.box.keyPair();
    setSecretKey(keyPair.secretKey);
    setPublicKey(keyPair.publicKey);
    return keyPair;
  };

  // Connect - exactly like official example
  const connectWallet = async () => {
    try {
      console.log('Connecting to Petra wallet...');
      setIsConnecting(true);

      const keyPair = generateAndSaveKeyPair();
      console.log('Generated key pair:', {
        hasSecretKey: !!keyPair.secretKey,
        hasPublicKey: !!keyPair.publicKey
      });

      const data = {
        appInfo: APP_INFO,
        redirectLink: `${DAPP_LINK_BASE}/connect`,
        dappEncryptionPublicKey: Buffer.from(keyPair.publicKey).toString('hex'),
      };

      const deepLink = `${PETRA_LINK_BASE}/connect?data=${btoa(JSON.stringify(data))}`;
      console.log('Deep link:', deepLink);
      console.log('Data being sent:', data);

      await Linking.openURL(deepLink);
    } catch (error) {
      console.log('Error connecting to Petra:', error);
      setIsConnecting(false);
      Alert.alert('Error', 'Failed to connect to Petra wallet. Please try again.');
    }
  };

  // Disconnect - exactly like official example
  const disconnectWallet = async () => {
    try {
      if (!publicKey) {
        throw new Error('Missing public key');
      }

      const data = {
        appInfo: APP_INFO,
        redirectLink: `${DAPP_LINK_BASE}/disconnect`,
        dappEncryptionPublicKey: Buffer.from(publicKey).toString('hex'),
      };

      await Linking.openURL(
        `${PETRA_LINK_BASE}/disconnect?data=${btoa(JSON.stringify(data))}`,
      );

      setSecretKey(null);
      setPublicKey(null);
      setSharedPublicKey(null);
      setIsConnected(false);
      setWalletAddress(null);
    } catch (error) {
      console.log('Error disconnecting from Petra:', error);
      Alert.alert('Error', 'Failed to disconnect from Petra wallet');
    }
  };

  // Sign and submit transaction - exactly like official example
  const signAndSubmitTransaction = async (transaction, successMessage = null) => {
    console.log('Transaction signing state:', {
      isConnected,
      hasSharedPublicKey: !!sharedPublicKey,
      hasPublicKey: !!publicKey,
      walletAddress
    });

    if (!sharedPublicKey) {
      throw new Error('Missing shared public key. Please reconnect your wallet through Petra.');
    }

    if (!publicKey) {
      throw new Error('Missing public key. Please reconnect your wallet through Petra.');
    }

    // Store success message for later display
    if (successMessage) {
      setPendingSuccessMessage(successMessage);
    }

    try {
      console.log('Signing transaction with Petra:', transaction);

      const payload = btoa(JSON.stringify(transaction));
      const nonce = nacl.randomBytes(24);

      const encryptedPayload = nacl.box.after(
        Buffer.from(JSON.stringify(payload)),
        nonce,
        sharedPublicKey,
      );

      const data = btoa(JSON.stringify({
        appInfo: APP_INFO,
        payload: Buffer.from(encryptedPayload).toString('hex'),
        redirectLink: `${DAPP_LINK_BASE}/response`,
        dappEncryptionPublicKey: Buffer.from(publicKey).toString('hex'),
        nonce: Buffer.from(nonce).toString('hex'),
      }));

      await Linking.openURL(`${PETRA_LINK_BASE}/signAndSubmit?data=${data}`);
    } catch (error) {
      console.log('Error signing transaction:', error);
      throw new Error('Failed to sign transaction: ' + error.message);
    }
  };

  // Sign message - exactly like official example
  const signMessage = async (message) => {
    if (!sharedPublicKey) {
      throw new Error('Missing shared public key');
    }

    if (!publicKey) {
      throw new Error('Missing public key');
    }

    try {
      console.log('Signing message with Petra:', message);

      const nonce = nacl.randomBytes(24);

      const encryptedPayload = nacl.box.after(
        Buffer.from(
          btoa(
            JSON.stringify({
              message,
            }),
          ),
        ),
        nonce,
        sharedPublicKey,
      );

      const data = btoa(JSON.stringify({
        appInfo: APP_INFO,
        payload: Buffer.from(encryptedPayload).toString('hex'),
        redirectLink: `${DAPP_LINK_BASE}/response`,
        dappEncryptionPublicKey: Buffer.from(publicKey).toString('hex'),
        nonce: Buffer.from(nonce).toString('hex'),
      }));

      await Linking.openURL(`${PETRA_LINK_BASE}/signMessage?data=${data}`);
    } catch (error) {
      console.log('Error signing message:', error);
      throw new Error('Failed to sign message: ' + error.message);
    }
  };

  // Deep link handling - exactly like official example
  useEffect(() => {
    const handleConnectionApproval = (data) => {
      console.log('handleConnectionApproval called with data:', data);

      if (data === null) {
        throw new Error('Missing data from Petra response');
      }

      if (!secretKey) {
        throw new Error('Missing key pair');
      }

      const { petraPublicEncryptedKey, address } = JSON.parse(atob(data));
      console.log('Petra response data:', { petraPublicEncryptedKey, address });

      const sharedEncryptionSecretKey = nacl.box.before(
        new Uint8Array(Buffer.from(petraPublicEncryptedKey.slice(2), 'hex')),
        secretKey,
      );

      console.log('Encryption keys established:', {
        hasSharedPublicKey: !!sharedEncryptionSecretKey,
        hasSecretKey: !!secretKey,
        hasPublicKey: !!publicKey
      });

      setSharedPublicKey(sharedEncryptionSecretKey);
      setIsConnected(true);
      setWalletAddress(address); // Use real address from Petra
      setIsConnecting(false);
      Alert.alert('Success', `Connected to Petra wallet!\nAddress: ${address.substring(0, 10)}...${address.substring(address.length - 6)}`);
    };

    const handleConnectionRejection = () => {
      setIsConnecting(false);
      Alert.alert('Connection Rejected', 'Petra wallet connection was rejected');
    };

    const handleConnection = (params) => {
      if (params.get('response') === 'approved') {
        handleConnectionApproval(params.get('data'));
      } else {
        handleConnectionRejection();
      }
    };

    const handleUrl = (url) => {
      console.log('Received deep link:', url);
      if (!url) {
        return;
      }

      const urlObject = new URL(url);
      const params = new URLSearchParams(urlObject.search);
      console.log('URL pathname:', urlObject.pathname);
      console.log('URL params:', Object.fromEntries(params.entries()));
      console.log('Current wallet state before processing:', {
        isConnected,
        hasSharedPublicKey: !!sharedPublicKey,
        hasPublicKey: !!publicKey,
        walletAddress
      });

      switch (urlObject.pathname) {
        case '/--/sobercash/connect': {
          handleConnection(params);
          break;
        }
        default:
          if (params.get('response') === 'approved') {
            const data = params.get('data');
            if (data) {
              try {
                const parsedResponse = JSON.parse(atob(data));
                console.log('Petra response:', parsedResponse);
                
                // Show the pending success message if we have one
                if (pendingSuccessMessage) {
                  Alert.alert('Success', pendingSuccessMessage);
                  setPendingSuccessMessage(null);
                }
              } catch (error) {
                console.log('Error parsing response data:', error);
                
                // Show the pending success message even if parsing fails
                if (pendingSuccessMessage) {
                  Alert.alert('Success', pendingSuccessMessage);
                  setPendingSuccessMessage(null);
                }
              }
            }
          } else if (params.get('response') === 'rejected') {
            Alert.alert('Rejected', 'Operation was rejected by Petra wallet');
          }
          break;
      }
    };

    Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      subscription?.remove();
    };
  }, [secretKey]);


  const value = {
    isConnected,
    walletAddress,
    isConnecting,
    connectWallet,
    disconnectWallet,
    signAndSubmitTransaction,
    signMessage,
  };

  return (
    <PetraWalletContext.Provider value={value}>
      {children}
    </PetraWalletContext.Provider>
  );
};