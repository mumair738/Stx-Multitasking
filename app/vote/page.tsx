'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { checkPOAPOwnership, createProposal, castVote } from '@/lib/stacks';
import { Vote, Plus, Wallet, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

interface Proposal {
  id: string;
  title: string;
  description: string;
  created_by: string;
  start_block: number;
  end_block: number;
  options: string[];
  votes: Record<string, number>;
  total_votes: number;
  status: 'active' | 'ended';
}

export default function VotingPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [hasPOAP, setHasPOAP] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    duration: '1000',
    options: ['', ''],
  });

  const supabase = createClient();

  useEffect(() => {
    loadProposals();
  }, []);

  useEffect(() => {
    if (isConnected && userAddress) {
      checkPOAPStatus();
    }
  }, [isConnected, userAddress]);

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
      },
      userSession,
    });
  };

  const checkPOAPStatus = async () => {
    const owns = await checkPOAPOwnership(userAddress);
    setHasPOAP(owns);
  };

  const loadProposals = async () => {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setProposals(data);
    }
  };

  const handleCreateProposal = async () => {
    if (!hasPOAP) {
      alert('You need a POAP to create proposals');
      return;
    }

    setIsLoading(true);
    try {
      await createProposal(
        newProposal.title,
        newProposal.description,
        parseInt(newProposal.duration),
        newProposal.options.filter(opt => opt.trim() !== '')
      );

      // Save to Supabase
      await supabase.from('proposals').insert({
        title: newProposal.title,
        description: newProposal.description,
        created_by: userAddress,
        start_block: 0,
        end_block: parseInt(newProposal.duration),
        options: newProposal.options.filter(opt => opt.trim() !== ''),
        votes: {},
        total_votes: 0,
        status: 'active',
      });

      setShowCreateDialog(false);
      setNewProposal({
        title: '',
        description: '',
        duration: '1000',
        options: ['', ''],
      });
      loadProposals();
    } catch (err) {
      console.error('[v0] Error creating proposal:', err);
      alert('Failed to create proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (proposalId: string, optionIndex: number) => {
    if (!hasPOAP) {
      alert('You need a POAP to vote');
      return;
    }

    try {
      await castVote(parseInt(proposalId), optionIndex + 1);
      
      // Update Supabase
      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal) {
        const newVotes = { ...proposal.votes, [optionIndex]: (proposal.votes[optionIndex] || 0) + 1 };
        await supabase
          .from('proposals')
          .update({ 
            votes: newVotes,
            total_votes: proposal.total_votes + 1
          })
          .eq('id', proposalId);

        // Record user vote
        await supabase.from('votes').insert({
          proposal_id: proposalId,
          user_address: userAddress,
          option_index: optionIndex,
        });

        loadProposals();
      }
    } catch (err) {
      console.error('[v0] Error casting vote:', err);
      alert('Failed to cast vote');
    }
  };

  const addOption = () => {
    if (newProposal.options.length < 10) {
      setNewProposal({
        ...newProposal,
        options: [...newProposal.options, ''],
      });
    }
  };

  const removeOption = (index: number) => {
    if (newProposal.options.length > 2) {
      setNewProposal({
        ...newProposal,
        options: newProposal.options.filter((_, i) => i !== index),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Badge variant="outline" className="mb-3">
                Governance
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                Voting Proposals
              </h1>
              <p className="text-muted-foreground text-lg">
                Participate in community governance
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!isConnected ? (
                <Button onClick={connectWallet} size="lg">
                  <Wallet className="mr-2 h-5 w-5" />
                  Connect Wallet
                </Button>
              ) : (
                <>
                  <Badge variant={hasPOAP ? 'default' : 'secondary'} className="px-4 py-2">
                    {hasPOAP ? (
                      <>
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        POAP Holder
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-4 w-4" />
                        No POAP
                      </>
                    )}
                  </Badge>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button size="lg" disabled={!hasPOAP}>
                        <Plus className="mr-2 h-5 w-5" />
                        Create Proposal
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Proposal</DialogTitle>
                        <DialogDescription>
                          Create a new voting proposal for the community
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            value={newProposal.title}
                            onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                            placeholder="Proposal title"
                            maxLength={200}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={newProposal.description}
                            onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                            placeholder="Describe your proposal..."
                            rows={4}
                            maxLength={1000}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration">Duration (blocks)</Label>
                          <Input
                            id="duration"
                            type="number"
                            value={newProposal.duration}
                            onChange={(e) => setNewProposal({ ...newProposal, duration: e.target.value })}
                            placeholder="1000"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Options</Label>
                          {newProposal.options.map((option, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...newProposal.options];
                                  newOptions[index] = e.target.value;
                                  setNewProposal({ ...newProposal, options: newOptions });
                                }}
                                placeholder={`Option ${index + 1}`}
                                maxLength={200}
                              />
                              {newProposal.options.length > 2 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeOption(index)}
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          ))}
                          {newProposal.options.length < 10 && (
                            <Button type="button" variant="outline" onClick={addOption} className="w-full bg-transparent">
                              <Plus className="mr-2 h-4 w-4" />
                              Add Option
                            </Button>
                          )}
                        </div>
                        <Button onClick={handleCreateProposal} disabled={isLoading} className="w-full">
                          {isLoading ? 'Creating...' : 'Create Proposal'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>

          {!hasPOAP && isConnected && (
            <Alert className="mb-6">
              <AlertDescription>
                You need to own a POAP to create proposals and vote. Visit the mint page to get one.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6">
            {proposals.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Vote className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No proposals yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Be the first to create a proposal and start community governance
                  </p>
                </CardContent>
              </Card>
            ) : (
              proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onVote={handleVote}
                  userAddress={userAddress}
                  hasPOAP={hasPOAP}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposalCard({
  proposal,
  onVote,
  userAddress,
  hasPOAP,
}: {
  proposal: Proposal;
  onVote: (proposalId: string, optionIndex: number) => void;
  userAddress: string;
  hasPOAP: boolean;
}) {
  const [hasVoted, setHasVoted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    checkVoteStatus();
  }, [proposal.id, userAddress]);

  const checkVoteStatus = async () => {
    if (!userAddress) return;
    
    const { data } = await supabase
      .from('votes')
      .select('*')
      .eq('proposal_id', proposal.id)
      .eq('user_address', userAddress)
      .single();
    
    setHasVoted(!!data);
  };

  const getPercentage = (optionIndex: number) => {
    if (proposal.total_votes === 0) return 0;
    return ((proposal.votes[optionIndex] || 0) / proposal.total_votes) * 100;
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-2">{proposal.title}</CardTitle>
            <CardDescription className="text-base">{proposal.description}</CardDescription>
          </div>
          <Badge variant={proposal.status === 'active' ? 'default' : 'secondary'}>
            {proposal.status === 'active' ? (
              <>
                <Clock className="mr-1 h-3 w-3" />
                Active
              </>
            ) : (
              'Ended'
            )}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
          <span>{proposal.total_votes} votes</span>
          <span>Ends at block {proposal.end_block}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposal.options.map((option, index) => {
          const percentage = getPercentage(index);
          const voteCount = proposal.votes[index] || 0;
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <Button
                  variant={hasVoted ? 'outline' : 'default'}
                  className="flex-1 justify-start"
                  onClick={() => onVote(proposal.id, index)}
                  disabled={!hasPOAP || hasVoted || proposal.status !== 'active'}
                >
                  <span className="font-medium">{option}</span>
                  <span className="ml-auto text-sm">
                    {voteCount} votes ({percentage.toFixed(1)}%)
                  </span>
                </Button>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
        {hasVoted && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>You have already voted on this proposal</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
