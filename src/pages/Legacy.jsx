import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, UserPlus, Heart, AlertCircle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AIChatbot from '@/components/chat/AIChatbot';

export default function Legacy() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newContact, setNewContact] = useState({
    contact_name: '',
    contact_email: '',
    relationship: '',
    permissions: [],
    inheritance_percentage: 0
  });

  const queryClient = useQueryClient();

  const { data: trustedContacts = [] } = useQuery({
    queryKey: ['trustedContacts'],
    queryFn: () => base44.entities.TrustedContact.list(),
    initialData: [],
  });

  const addContactMutation = useMutation({
    mutationFn: (contactData) => base44.entities.TrustedContact.create(contactData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustedContacts'] });
      setShowAddDialog(false);
      setNewContact({
        contact_name: '',
        contact_email: '',
        relationship: '',
        permissions: [],
        inheritance_percentage: 0
      });
    },
  });

  const handleAddContact = () => {
    addContactMutation.mutate(newContact);
  };

  const togglePermission = (permission) => {
    setNewContact(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950/20 to-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Legacy & Recovery</h1>
            <p className="text-white/60">Protect your assets and plan for the future</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Trusted Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Add Trusted Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Full Name</Label>
                  <Input
                    value={newContact.contact_name}
                    onChange={(e) => setNewContact({...newContact, contact_name: e.target.value})}
                    placeholder="John Doe"
                    className="bg-gray-800 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Email Address</Label>
                  <Input
                    value={newContact.contact_email}
                    onChange={(e) => setNewContact({...newContact, contact_email: e.target.value})}
                    placeholder="john@example.com"
                    className="bg-gray-800 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Relationship</Label>
                  <Input
                    value={newContact.relationship}
                    onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                    placeholder="Spouse, Child, Friend, etc."
                    className="bg-gray-800 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white mb-2 block">Permissions</Label>
                  <div className="space-y-2">
                    {['recovery', 'inheritance', 'alerts'].map(permission => (
                      <label key={permission} className="flex items-center gap-2 text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newContact.permissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          className="w-4 h-4"
                        />
                        <span className="capitalize">{permission}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-white">Inheritance Percentage</Label>
                  <Input
                    type="number"
                    value={newContact.inheritance_percentage}
                    onChange={(e) => setNewContact({...newContact, inheritance_percentage: parseFloat(e.target.value)})}
                    placeholder="0"
                    min="0"
                    max="100"
                    className="bg-gray-800 border-white/10 text-white"
                  />
                </div>
                <Button onClick={handleAddContact} className="w-full bg-blue-500 hover:bg-blue-600">
                  Add Contact
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-900/30 border-blue-500/30">
            <CardContent className="p-6">
              <Shield className="w-10 h-10 text-blue-400 mb-3" />
              <h3 className="text-white font-bold mb-2">Account Recovery</h3>
              <p className="text-white/70 text-sm">Trusted contacts can help you regain access if you lose your password</p>
            </CardContent>
          </Card>

          <Card className="bg-green-900/30 border-green-500/30">
            <CardContent className="p-6">
              <Heart className="w-10 h-10 text-green-400 mb-3" />
              <h3 className="text-white font-bold mb-2">Inheritance Planning</h3>
              <p className="text-white/70 text-sm">Ensure your assets go to the right people when the time comes</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-900/30 border-purple-500/30">
            <CardContent className="p-6">
              <AlertCircle className="w-10 h-10 text-purple-400 mb-3" />
              <h3 className="text-white font-bold mb-2">Emergency Alerts</h3>
              <p className="text-white/70 text-sm">Contacts receive notifications about important security events</p>
            </CardContent>
          </Card>
        </div>

        {/* Trusted Contacts List */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Your Trusted Contacts</CardTitle>
            <CardDescription className="text-white/60">
              {trustedContacts.length === 0 
                ? "No trusted contacts added yet. Add someone you trust to help protect your assets."
                : `You have ${trustedContacts.length} trusted contact${trustedContacts.length > 1 ? 's' : ''}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trustedContacts.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <p className="text-white/60 mb-4">Start building your safety net</p>
                <Button onClick={() => setShowAddDialog(true)} className="bg-blue-500 hover:bg-blue-600">
                  Add Your First Contact
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {trustedContacts.map((contact) => (
                  <div key={contact.id} className="bg-gray-800/50 p-6 rounded-xl border border-white/10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg">{contact.contact_name}</h3>
                        <p className="text-white/60">{contact.contact_email}</p>
                        <p className="text-white/50 text-sm">{contact.relationship}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm ${
                        contact.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        contact.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {contact.status === 'active' ? <CheckCircle2 className="w-4 h-4 inline mr-1" /> : null}
                        {contact.status}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {contact.permissions?.map(perm => (
                        <span key={perm} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                          {perm}
                        </span>
                      ))}
                    </div>
                    {contact.inheritance_percentage > 0 && (
                      <p className="text-white/70 text-sm">
                        Inheritance allocation: <strong>{contact.inheritance_percentage}%</strong>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white">🛡️ How It Works</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 space-y-3">
            <p>✓ <strong>Multi-Signature Security:</strong> Recovery requires multiple trusted contacts to approve, preventing single-point failures</p>
            <p>✓ <strong>Time-Locked Inheritance:</strong> Assets are only transferred after a specified inactivity period, with multiple safeguards</p>
            <p>✓ <strong>Privacy Protected:</strong> Contacts only see what they need to - never your full balance or transaction history</p>
            <p>✓ <strong>Your Control:</strong> You can add, remove, or change permissions anytime. It's your money, your rules</p>
          </CardContent>
        </Card>

      </div>

      <AIChatbot />
    </div>
  );
}