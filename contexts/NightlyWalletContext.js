import * as LinkingExpo from 'expo-linking';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { buildAppInfo, buildDataParam, getRouteKind, parseUrl } from '../utils/nightlyDeeplink';
import { decryptPayload, deriveSharedSecret, encryptPayload, generateKeypair, tryBase64JsonDecode } from '../utils/nightlyEncryption';

const NightlyWalletContext = createContext();

export const useNightlyWallet = () => {
  const context = useContext(NightlyWalletContext);
  if (!context) {
    throw new Error('useNightlyWallet must be used within a NightlyWalletProvider');
  }
  return context;
};

// Constants for Nightly deep links
const NIGHTLY_LINK_BASE = 'nightly://v1/direct';
// Build the current Expo callback base dynamically to avoid stale exp:// URLs
const DAPP_LINK_BASE = LinkingExpo.createURL('/sobercash');

// Network and cluster configuration (Movement testnet)
const NETWORK = 'movement';
const CLUSTER = 'testnet'; // Using testnet for development

export const NightlyWalletProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Key management for Nightly
  const [initialKeys] = useState(() => generateKeypair());
  const [dappPublicKey, setDappPublicKey] = useState(initialKeys.publicKey58);
  const [dappSecretKey, setDappSecretKey] = useState(initialKeys.secretKey);
  const [walletSharedKey, setWalletSharedKey] = useState(null);

  // Success message state
  const [pendingSuccessMessage, setPendingSuccessMessage] = useState(null);
  const [awaitingConnectCallback, setAwaitingConnectCallback] = useState(false);
  const [lastCanOpenResults, setLastCanOpenResults] = useState({ walletScheme: null, callbackRoute: null });

  // Connect to Nightly wallet
  const connectWallet = async () => {
    try {
      console.log('Connecting to Nightly wallet...');
      setIsConnecting(true);

      const data = {
        network: NETWORK,
        cluster: CLUSTER,
        responseRoute: `${DAPP_LINK_BASE}/connect`,
        appInfo: buildAppInfo(),
        dappEncryptionPublicKey: dappPublicKey,
      };

      const url = `${NIGHTLY_LINK_BASE}/connect?data=${buildDataParam(data)}`;
      console.log('Nightly connect URL:', url);
      console.log('Data being sent:', data);

      // Debug: can the OS open the wallet scheme and our callback route?
      try {
        const walletOk = await Linking.canOpenURL('nightly://');
        const callbackOk = await Linking.canOpenURL(`${DAPP_LINK_BASE}/connect`);
        setLastCanOpenResults({ walletScheme: walletOk, callbackRoute: callbackOk });
        console.log('canOpenURL results:', { walletScheme: walletOk, callbackRoute: callbackOk });
      } catch (e) {
        console.log('canOpenURL threw:', e?.message || String(e));
        setLastCanOpenResults({ walletScheme: null, callbackRoute: null });
      }

      setAwaitingConnectCallback(true);
      await Linking.openURL(url);

      // If no callback within 10s, surface a diagnostic
      setTimeout(() => {
        if (awaitingConnectCallback) {
          console.log('No Nightly callback received within timeout', {
            responseRoute: `${DAPP_LINK_BASE}/connect`,
            canOpen: lastCanOpenResults,
          });
          try {
            Alert.alert(
              'No wallet callback',
              `No response from Nightly within 10s.\nresponseRoute: ${DAPP_LINK_BASE}/connect\nwallet scheme ok: ${String(lastCanOpenResults.walletScheme)}\ncallback openable: ${String(lastCanOpenResults.callbackRoute)}`,
            );
          } catch { }
        }
      }, 10000);
    } catch (error) {
      console.log('Error connecting to Nightly:', error);
      setIsConnecting(false);
      Alert.alert('Error', 'Failed to connect to Nightly wallet. Please try again.');
    }
  };

  // Disconnect from Nightly wallet
  const disconnectWallet = async () => {
    try {
      console.log('Disconnecting from Nightly wallet...');

      // Clear all state
      setIsConnected(false);
      setWalletAddress(null);
      setWalletSharedKey(null);

      // Generate new keypair for next connection
      const newKeys = generateKeypair();
      setDappPublicKey(newKeys.publicKey58);
      setDappSecretKey(newKeys.secretKey);

      Alert.alert('Success', 'Wallet disconnected');
    } catch (error) {
      console.log('Error disconnecting from Nightly:', error);
      Alert.alert('Error', 'Failed to disconnect from Nightly wallet');
    }
  };

  // Sign and submit transaction
  const signAndSubmitTransaction = async (transaction, successMessage = null) => {
    console.log('Transaction signing state:', {
      isConnected,
      hasWalletSharedKey: !!walletSharedKey,
      hasDappPublicKey: !!dappPublicKey,
      walletAddress
    });

    if (!walletSharedKey) {
      throw new Error('Missing shared key. Please reconnect your wallet through Nightly.');
    }

    if (!dappPublicKey) {
      throw new Error('Missing public key. Please reconnect your wallet through Nightly.');
    }

    if (!walletAddress) {
      throw new Error('Missing wallet address. Please reconnect your wallet through Nightly.');
    }

    // Store success message for later display
    if (successMessage) {
      setPendingSuccessMessage(successMessage);
    }

    try {
      console.log('Signing transaction with Nightly:', transaction);

      // Create the transaction payload for Nightly
      const transactionPayload = {
        transactions: [JSON.stringify(transaction)],
        options: { submit: true }
      };

      // Encrypt the payload
      const encrypted = encryptPayload(walletSharedKey, transactionPayload);

      const data = {
        network: NETWORK,
        cluster: CLUSTER,
        responseRoute: `${DAPP_LINK_BASE}/response`,
        payload: encrypted.dataB64,
        nonce: encrypted.nonce58,
        dappEncryptionPublicKey: dappPublicKey,
        address: walletAddress,
        appInfo: buildAppInfo(),
      };

      const url = `${NIGHTLY_LINK_BASE}/signTransactions?data=${buildDataParam(data)}`;
      console.log('Nightly sign transaction URL:', url);

      await Linking.openURL(url);
    } catch (error) {
      console.log('Error signing transaction:', error);
      throw new Error('Failed to sign transaction: ' + error.message);
    }
  };

  // Sign message
  const signMessage = async (message) => {
    if (!walletSharedKey) {
      throw new Error('Missing shared key');
    }

    if (!dappPublicKey) {
      throw new Error('Missing public key');
    }

    if (!walletAddress) {
      throw new Error('Missing wallet address');
    }

    try {
      console.log('Signing message with Nightly:', message);

      // Create the message payload for Nightly
      const messagePayload = {
        message: {
          message: message,
          nonce: Math.random().toString().split('.')[1],
          fullMessage: `APTOS\nmessage: ${message}\nnonce: ${Math.random().toString().split('.')[1]}`,
        }
      };

      // Encrypt the payload
      const encrypted = encryptPayload(walletSharedKey, messagePayload);

      const data = {
        network: NETWORK,
        cluster: CLUSTER,
        responseRoute: `${DAPP_LINK_BASE}/response`,
        payload: encrypted.dataB64,
        nonce: encrypted.nonce58,
        dappEncryptionPublicKey: dappPublicKey,
        address: walletAddress,
        appInfo: buildAppInfo(),
      };

      const url = `${NIGHTLY_LINK_BASE}/signMessage?data=${buildDataParam(data)}`;
      console.log('Nightly sign message URL:', url);
      await Linking.openURL(url);

    } catch (error) {
      console.log('Error in signMessage:', error);
      Alert.alert('Message Signing Failed', error.message);
      throw error;
    }
  };

  // Handle connection response
  const handleConnectionData = useCallback((decoded) => {
    if (!decoded || typeof decoded !== 'object') return decoded;

    // Check if it's a WalletEncryptedResponse
    if (decoded.success && decoded.walletPub && decoded.nonce && decoded.payload) {
      let ss = walletSharedKey;
      if (!ss && decoded.walletPub && dappSecretKey.length) {
        try {
          ss = deriveSharedSecret(decoded.walletPub, dappSecretKey);
          setWalletSharedKey(ss);
        } catch (e) {
          console.warn('Failed to derive shared key:', e instanceof Error ? e.message : String(e));
        }
      }

      if (ss) {
        try {
          const dec = decryptPayload(ss, decoded.nonce, decoded.payload);
          if (dec.activeAccount && dec.activeAccount.address) {
            setWalletAddress(dec.activeAccount.address);
            setIsConnected(true);
            setIsConnecting(false);
            setAwaitingConnectCallback(false);
            Alert.alert('Success', `Connected to Nightly wallet!\nAddress: ${dec.activeAccount.address.substring(0, 10)}...${dec.activeAccount.address.substring(dec.activeAccount.address.length - 6)}`);
          }
          return { ...decoded, payload: dec };
        } catch (e) {
          console.warn('Decryption failed (connect):', e instanceof Error ? e.message : String(e));
        }
      }
    }
    return decoded;
  }, [walletSharedKey, dappSecretKey]);

  // Handle response data (for transactions and messages)
  const handleResponseData = useCallback((decoded) => {
    if (!decoded || typeof decoded !== 'object') return decoded;

    // Check if it's a WalletEncryptedResponse
    if (decoded.success && decoded.walletPub && decoded.nonce && decoded.payload) {
      const ss = walletSharedKey;
      if (ss) {
        try {
          const dec = decryptPayload(ss, decoded.nonce, decoded.payload);

          // Show the pending success message if we have one
          if (pendingSuccessMessage) {
            Alert.alert('Success', pendingSuccessMessage);
            setPendingSuccessMessage(null);
          }

          return { ...decoded, payload: dec };
        } catch (e) {
          console.warn('Decryption failed (response):', e instanceof Error ? e.message : String(e));

          // Show the pending success message even if decryption fails
          if (pendingSuccessMessage) {
            Alert.alert('Success', pendingSuccessMessage);
            setPendingSuccessMessage(null);
          }
        }
      }
    }
    return decoded;
  }, [walletSharedKey, pendingSuccessMessage]);

  // Main deep link handler
  const handleUrl = useCallback((url) => {
    console.log('Received deep link:', url);
    if (!url) return;

    try {
      const parsed = parseUrl(url);
      const routeKind = getRouteKind(parsed.href);
      const params = {};

      const rawData = typeof parsed.params.data === 'string' ? parsed.params.data : null;
      const decoded = tryBase64JsonDecode(rawData);

      if (decoded && typeof decoded === 'object') {
        let out = decoded;
        switch (routeKind) {
          case 'connect':
            out = handleConnectionData(decoded);
            break;
          case 'response':
            out = handleResponseData(decoded);
            break;
          default:
            out = decoded;
            break;
        }
        params.data = out;
      }

      console.log('Processed deep link:', { routeKind, params });
    } catch (e) {
      console.log('Error processing deep link:', e);
    }
  }, [handleConnectionData, handleResponseData]);

  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      subscription?.remove();
    };
  }, [handleUrl]);

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
    <NightlyWalletContext.Provider value={value}>
      {children}
    </NightlyWalletContext.Provider>
  );
};
