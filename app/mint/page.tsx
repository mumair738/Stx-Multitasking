'use client';

import React from "react"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { mintPOAPWithWallet } from '@/lib/stacks';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { Loader2, CheckCircle2, Wallet } from 'lucide-react';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export default function MintPOAPPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    recipient: '',
    eventName: '',
    eventDate: '',
    imageUri: '',
  });

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'POAP Platform',
        icon: '/icon.png',
      },
      redirectTo: '/',
      onFinish: () => {
        const userData = userSession.loadUserData();
        setIsConnected(true);
        setUserAddress(userData.profile.stxAddress.testnet);
        setFormData(prev => ({ ...prev, recipient: userData.profile.stxAddress.testnet }));
      },
      userSession,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const eventTimestamp = new Date(formData.eventDate).getTime();
      
      await mintPOAPWithWallet(
        formData.recipient,
        formData.eventName,
        eventTimestamp,
        formData.imageUri
      );
      
      setSuccess(true);
      setFormData({
        recipient: userAddress,
        eventName: '',
        eventDate: '',
        imageUri: '',
      });
    } catch (err: any) {
      console.error('[v0] POAP minting error:', err);
      setError(err.message || 'Failed to mint POAP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">
              Stacks Blockchain
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              Mint POAP NFT
            </h1>
            <p className="text-muted-foreground text-lg">
              Create proof of attendance protocol tokens for your events
            </p>
          </div>

          {!isConnected ? (
            <Card className="border-2">
              <CardHeader className="text-center">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-primary" />
                <CardTitle>Connect Your Wallet</CardTitle>
                <CardDescription>
                  Connect your Stacks wallet to mint POAPs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={connectWallet} size="lg" className="w-full">
                  <Wallet className="mr-2 h-5 w-5" />
                  Connect Wallet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Mint New POAP</CardTitle>
                <CardDescription>
                  Fill in the event details to create a new POAP NFT
                </CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {userAddress.slice(0, 8)}...{userAddress.slice(-6)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="recipient">Recipient Address</Label>
                    <Input
                      id="recipient"
                      value={formData.recipient}
                      onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                      placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventName">Event Name</Label>
                    <Input
                      id="eventName"
                      value={formData.eventName}
                      onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                      placeholder="Stacks Summit 2026"
                      maxLength={50}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventDate">Event Date</Label>
                    <Input
                      id="eventDate"
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageUri">Image URI</Label>
                    <Textarea
                      id="imageUri"
                      value={formData.imageUri}
                      onChange={(e) => setFormData({ ...formData, imageUri: e.target.value })}
                      placeholder="https://example.com/poap-image.png"
                      maxLength={256}
                      rows={3}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a URL to the POAP image (max 256 characters)
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-600">
                        POAP minted successfully! Check your wallet.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={isLoading} size="lg" className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Minting POAP...
                      </>
                    ) : (
                      'Mint POAP'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
