import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function DIDManager({ isOpen, onClose, onConnect }) {
  const [didAddress, setDidAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [credentials, setCredentials] = useState([]);

  useEffect(() => {
    // Check if DID is already connected
    const storedDID = localStorage.getItem('did_address');
    if (storedDID) {
      setDidAddress(storedDID);
      setIsConnected(true);
      loadCredentials(storedDID);
    }
  }, []);

  const loadCredentials = (did) => {
    // Mock verifiable credentials
    const mockCredentials = [
      { type: 'ProofOfHumanity', issuer: 'WorldID', verified: true },
      { type: 'AgeVerification', issuer: 'CivicPass', verified: true },
      { type: 'LocationCredential', issuer: 'GeoDB', verified: false },
    ];
    setCredentials(mockCredentials);
  };

  const generateDID = async () => {
    // Simulate DID generation (would use actual DID protocol in production)
    const mockDID = `did:ethr:0x${Math.random().toString(16).substr(2, 40)}`;
    setDidAddress(mockDID);
    localStorage.setItem('did_address', mockDID);
    setIsConnected(true);
    loadCredentials(mockDID);
    onConnect(mockDID);
  };

  const disconnectDID = () => {
    localStorage.removeItem('did_address');
    setDidAddress('');
    setIsConnected(false);
    setCredentials([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Decentralized Identity
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Info Banner */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <p className="text-purple-400 text-sm font-medium mb-1">What is DID?</p>
            <p className="text-white/70 text-xs">
              Decentralized Identity lets you interact with DApps and casinos without exposing your wallet address. 
              Complete anonymity with verifiable credentials.
            </p>
          </div>

          {!isConnected ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                  <Key className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-white font-bold mb-2">No DID Connected</h3>
                <p className="text-white/50 text-sm text-center mb-4">
                  Generate a decentralized identity to interact anonymously
                </p>
                <Button
                  onClick={generateDID}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate DID
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* DID Address */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70 text-sm">Your DID</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-white font-mono text-xs break-all">{didAddress}</p>
              </div>

              {/* Verifiable Credentials */}
              <div>
                <h4 className="text-white font-semibold mb-3">Verifiable Credentials</h4>
                <div className="space-y-2">
                  {credentials.map((cred, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {cred.verified ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                        )}
                        <div>
                          <p className="text-white text-sm font-medium">{cred.type}</p>
                          <p className="text-white/50 text-xs">Issued by {cred.issuer}</p>
                        </div>
                      </div>
                      {cred.verified && (
                        <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                          Verified
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Disconnect */}
              <Button
                onClick={disconnectDID}
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
              >
                Disconnect DID
              </Button>
            </div>
          )}

          {/* Privacy Features */}
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-white font-semibold mb-2 text-sm">Privacy Features</h4>
            <ul className="space-y-2 text-xs text-white/70">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                <span>No wallet address exposure to DApps</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                <span>Self-sovereign identity control</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                <span>Zero-knowledge proof authentication</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                <span>Compatible with all integrated DApps & Casinos</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}