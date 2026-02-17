import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Smartphone, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function TransactionSecurityPrompt({ 
  isOpen, 
  onClose, 
  onConfirm,
  transactionDetails 
}) {
  const [passphrase, setPassphrase] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [securityMethod, setSecurityMethod] = useState('passphrase'); // passphrase, 2fa, hardware
  const [step, setStep] = useState(1); // 1: method selection, 2: verification

  const isHighValue = transactionDetails?.totalValue > 1000;
  const requiresEnhancedSecurity = transactionDetails?.totalValue > 5000;

  const handleMethodSelect = (method) => {
    setSecurityMethod(method);
    setStep(2);
  };

  const handleVerify = () => {
    if (securityMethod === 'passphrase' && passphrase) {
      onConfirm({ method: 'passphrase', credential: passphrase });
    } else if (securityMethod === '2fa' && twoFactorCode) {
      onConfirm({ method: '2fa', credential: twoFactorCode });
    } else if (securityMethod === 'hardware') {
      onConfirm({ method: 'hardware', credential: 'hardware_approved' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Transaction Security Verification
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            {/* Transaction Summary */}
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2">Transaction Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Type</span>
                  <span className="text-white">{transactionDetails?.type || 'Transfer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Total Value</span>
                  <span className="text-white font-semibold">${transactionDetails?.totalValue?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Transactions</span>
                  <span className="text-white">{transactionDetails?.count || 1}</span>
                </div>
              </div>
            </div>

            {/* Security Level Alert */}
            {isHighValue && (
              <div className={`rounded-lg p-3 ${requiresEnhancedSecurity ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                <p className={`text-sm flex items-center gap-2 ${requiresEnhancedSecurity ? 'text-red-400' : 'text-yellow-400'}`}>
                  <AlertTriangle className="w-4 h-4" />
                  {requiresEnhancedSecurity ? 'High-value transaction detected. Enhanced security required.' : 'Medium-value transaction. Additional security recommended.'}
                </p>
              </div>
            )}

            {/* Security Methods */}
            <div className="space-y-3">
              <h4 className="text-white font-semibold text-sm">Select Security Method</h4>
              
              {/* Passphrase */}
              <button
                onClick={() => handleMethodSelect('passphrase')}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-white font-semibold">Wallet Passphrase</p>
                      <p className="text-white/50 text-xs">Standard security</p>
                    </div>
                  </div>
                  {!requiresEnhancedSecurity && (
                    <Badge className="bg-green-500/20 text-green-400">Available</Badge>
                  )}
                </div>
              </button>

              {/* 2FA */}
              <button
                onClick={() => handleMethodSelect('2fa')}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-white font-semibold">Two-Factor Authentication</p>
                      <p className="text-white/50 text-xs">Enhanced security</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400">Recommended</Badge>
                </div>
              </button>

              {/* Hardware Wallet */}
              <button
                onClick={() => handleMethodSelect('hardware')}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-white font-semibold">Hardware Wallet</p>
                      <p className="text-white/50 text-xs">Maximum security (Ledger/Trezor)</p>
                    </div>
                  </div>
                  {requiresEnhancedSecurity && (
                    <Badge className="bg-green-500/20 text-green-400">Required</Badge>
                  )}
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Passphrase Method */}
            {securityMethod === 'passphrase' && (
              <>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/70 text-sm mb-2">Enter your wallet passphrase to confirm this transaction.</p>
                  <Input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter passphrase"
                    className="bg-white/5 border-white/10"
                    autoFocus
                  />
                </div>
              </>
            )}

            {/* 2FA Method */}
            {securityMethod === '2fa' && (
              <>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/70 text-sm mb-2">Enter the 6-digit code from your authenticator app.</p>
                  <Input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="bg-white/5 border-white/10 text-center text-2xl tracking-widest"
                    maxLength={6}
                    autoFocus
                  />
                </div>
              </>
            )}

            {/* Hardware Wallet Method */}
            {securityMethod === 'hardware' && (
              <>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    <h4 className="text-green-400 font-semibold">Hardware Wallet Detected</h4>
                  </div>
                  <p className="text-white/70 text-sm mb-3">Please confirm the transaction on your hardware device.</p>
                  <div className="bg-white/5 rounded p-3 text-center">
                    <p className="text-white text-sm">Waiting for device confirmation...</p>
                    <div className="mt-2 flex justify-center">
                      <div className="animate-pulse text-green-400">●</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="w-full bg-white/5 border-white/10"
            >
              ← Back to Security Methods
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-white/5 border-white/10"
          >
            Cancel
          </Button>
          {step === 2 && (
            <Button
              onClick={handleVerify}
              disabled={
                (securityMethod === 'passphrase' && !passphrase) ||
                (securityMethod === '2fa' && twoFactorCode.length !== 6)
              }
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Verify & Execute
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}