"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { identity, configure } from "deso-protocol";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [userPublicKey, setUserPublicKey] = useState(null);
  const [altUsers, setAltUsers] = useState({});
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const isRunned = useRef(false); // Prevents multiple initializations

  useEffect(() => {
    if (isRunned.current) return;
    isRunned.current = true;

    configure({
      spendingLimitOptions: {
        GlobalDESOLimit: 0.1 * 1e9,
        TransactionCountLimitMap: { SUBMIT_POST: "UNLIMITED" },
      },
      appName: "DeSo Next.js App",
    });

    identity.subscribe((state) => {
      const { currentUser, alternateUsers, event } = state;
      console.log("Identity State:", state);
      console.log({alternateUsers})

      switch (event) {
        case 'LOGIN_START':
          //setIsAuthChecking(true); 
          break; 
        case "SUBSCRIBE":
        case "LOGIN_END":
        case "CHANGE_ACTIVE_USER":
          setUserPublicKey(currentUser?.publicKey || null);
          setAltUsers(alternateUsers || {});
          setIsAuthChecking(false);    
          break;          
        case "LOGOUT_END": // on logout end we can set 1st available alt user if we want
          setUserPublicKey(currentUser?.publicKey || null);
          setAltUsers(alternateUsers || {});
          setIsAuthChecking(false);
          break;
      }
    });
  }, []);

  const login = async () => {
    //await identity.login(); // simple

    // user may close Identity window before finishing login flow
    await identity.login().catch((err) => {
      console.log("Error: ", err)
      setIsAuthChecking(false)
    })   

    // check errors here 
    // import { ERROR_TYPES } from '@deso/identity';
  };

  const logout = async () => {
    //await identity.logout(); // simple

    // user may close Identity window before finishing logout flow
    await identity.logout().catch((err) => {
      console.log("Error: ", err)
      setIsAuthChecking(false)
    })       
  };

  const setActiveUser = (publicKey) => {
    if (publicKey) {
      identity.setActiveUser(publicKey);
    }
  };

  const signTransaction = async (TransactionHex) => {
    return await identity.signTx(TransactionHex);
  };
  
  const submitTransaction = async (TransactionHex) => {
    return await identity.submitTx(TransactionHex);
  };  

  // can just use this instead of signTransaction and submitTransaction
  const signAndSubmitTransaction = async (TransactionHex) => {
    return await identity.signAndSubmit({ TransactionHex });
  };

  const getIdentityJWT = async () => {
    return await identity.jwt();
  };



  /**
   * Checks if the current derived key has permission to perform a specified transaction type (e.g., LIKE, SUBMIT_POST).
   * If permission is not granted, it opens the DeSo Identity window to request the required permission.
   *
   * This function also ensures that the derived key has a sufficient Global DESO spending limit
   * to cover transaction fees. If the limit is not set or too low, the transaction will fail
   * with "RuleErrorDerivedKeyTxnSpendsMoreThanGlobalDESOLimit".
   *
   * - LIKE transactions are set to 'UNLIMITED' by default since users are likely to perform them frequently.
   * - Other transaction types default to a count of 1 unless modified.
   *
   * ⚠️ Note: This opens the DeSo Identity popup. If the user cancels or closes it, the promise will reject.
   * You should handle errors when calling this function.
   *
   * @param {string} transactionType - The transaction type (e.g., 'LIKE', 'SUBMIT_POST', 'BASIC_TRANSFER').
   * @param {number} [globalDesoLimit=0.1 * 1e9] - Optional. The Global DESO spending limit (in nanos). Default is 0.1 DESO.
   * @throws Will throw an error if the Identity window is closed before completing permission request.
   */
  const ensureTransactionPermission = async (transactionType, globalDesoLimit = 0.1 * 1e9) => {
    try {
      const hasPermission = await identity.hasPermissions({
        TransactionCountLimitMap: {
          [transactionType]: 1,
        },
      });

      if (!hasPermission) {
        await identity.requestPermissions({
          GlobalDESOLimit: globalDesoLimit,
          TransactionCountLimitMap: {
            [transactionType]: transactionType === 'LIKE' ? 'UNLIMITED' : 1,
          },
        });
      }
    } catch (err) {
      console.error(`Failed to ensure permission for ${transactionType}:`, err);
      throw err; // Optional: Re-throw to handle higher up, or remove if you want to silently handle
    }
  };


  return (
    <AuthContext.Provider value={{ 
      userPublicKey, login, logout, setActiveUser, altUsers, isAuthChecking,
      signTransaction, submitTransaction, signAndSubmitTransaction, getIdentityJWT,
      ensureTransactionPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

