'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { Trophy, Target, TrendingUp, Award, Wallet, CheckCircle2 } from 'lucide-react';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

interface UserStats {
  user_address: string;
  posts_created: number;
  votes_cast: number;
  likes_given: number;
  poaps_owned: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  category: string;
  target: number;
  icon: string;
  reward_points: number;
}

export default function MilestonesPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    loadMilestones();
  }, []);

  useEffect(() => {
    if (isConnected && userAddress) {
      loadUserStats();
      loadCompletedMilestones();
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

  const loadUserStats = async () => {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_address', userAddress)
      .single();
    
    if (data) {
      setUserStats(data);
    } else {
      // Create initial stats
      const { data: newStats } = await supabase
        .from('user_stats')
        .insert({ user_address: userAddress })
        .select()
        .single();
      
      if (newStats) {
        setUserStats(newStats);
      }
    }
  };

  const loadMilestones = async () => {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .order('target', { ascending: true });
    
    if (data) {
      setMilestones(data);
    }
  };

  const loadCompletedMilestones = async () => {
    const { data } = await supabase
      .from('user_milestones')
      .select('milestone_id')
      .eq('user_address', userAddress);
    
    if (data) {
      setCompletedMilestones(new Set(data.map(m => m.milestone_id)));
    }
  };

  const checkAndCompleteMilestone = async (milestone: Milestone) => {
    if (completedMilestones.has(milestone.id)) return;

    let currentValue = 0;
    if (userStats) {
      switch (milestone.category) {
        case 'posts':
          currentValue = userStats.posts_created;
          break;
        case 'votes':
          currentValue = userStats.votes_cast;
          break;
        case 'likes':
          currentValue = userStats.likes_given;
          break;
        case 'poaps':
          currentValue = userStats.poaps_owned;
          break;
      }
    }

    if (currentValue >= milestone.target) {
      await supabase.from('user_milestones').insert({
        user_address: userAddress,
        milestone_id: milestone.id,
      });
      
      setCompletedMilestones(prev => new Set([...prev, milestone.id]));
    }
  };

  const getMilestoneProgress = (milestone: Milestone): number => {
    if (!userStats) return 0;
    
    let currentValue = 0;
    switch (milestone.category) {
      case 'posts':
        currentValue = userStats.posts_created;
        break;
      case 'votes':
        currentValue = userStats.votes_cast;
        break;
      case 'likes':
        currentValue = userStats.likes_given;
        break;
      case 'poaps':
        currentValue = userStats.poaps_owned;
        break;
    }
    
    return Math.min((currentValue / milestone.target) * 100, 100);
  };

  const getMilestoneIcon = (iconName: string) => {
    switch (iconName) {
      case 'trophy':
        return <Trophy className="h-6 w-6" />;
      case 'target':
        return <Target className="h-6 w-6" />;
      case 'trending':
        return <TrendingUp className="h-6 w-6" />;
      case 'award':
        return <Award className="h-6 w-6" />;
      default:
        return <Trophy className="h-6 w-6" />;
    }
  };

  const totalPoints = Array.from(completedMilestones).reduce((sum, milestoneId) => {
    const milestone = milestones.find(m => m.id === milestoneId);
    return sum + (milestone?.reward_points || 0);
  }, 0);

  const milestonesByCategory = milestones.reduce((acc, milestone) => {
    if (!acc[milestone.category]) {
      acc[milestone.category] = [];
    }
    acc[milestone.category].push(milestone);
    return acc;
  }, {} as Record<string, Milestone[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Badge variant="outline" className="mb-3">
                Achievements
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                Your Milestones
              </h1>
              <p className="text-muted-foreground text-lg">
                Track your progress and earn rewards
              </p>
            </div>

            {!isConnected ? (
              <Button onClick={connectWallet} size="lg">
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </Button>
            ) : (
              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Trophy className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Points</p>
                      <p className="text-3xl font-bold">{totalPoints}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {isConnected && userStats && (
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">{userStats.posts_created}</p>
                    <p className="text-sm text-muted-foreground">Posts Created</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">{userStats.votes_cast}</p>
                    <p className="text-sm text-muted-foreground">Votes Cast</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">{userStats.likes_given}</p>
                    <p className="text-sm text-muted-foreground">Likes Given</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">{userStats.poaps_owned}</p>
                    <p className="text-sm text-muted-foreground">POAPs Owned</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!isConnected ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Connect to View Milestones</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Connect your wallet to track your progress and see available milestones
                </p>
                <Button onClick={connectWallet} size="lg">
                  <Wallet className="mr-2 h-5 w-5" />
                  Connect Wallet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(milestonesByCategory).map(([category, categoryMilestones]) => (
                <div key={category}>
                  <h2 className="text-2xl font-bold mb-4 capitalize">
                    {category} Milestones
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {categoryMilestones.map((milestone) => {
                      const progress = getMilestoneProgress(milestone);
                      const isCompleted = completedMilestones.has(milestone.id);
                      
                      return (
                        <Card 
                          key={milestone.id} 
                          className={`border-2 ${isCompleted ? 'bg-primary/5 border-primary' : ''}`}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                                  isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-6 w-6" />
                                  ) : (
                                    getMilestoneIcon(milestone.icon)
                                  )}
                                </div>
                                <div>
                                  <CardTitle className="text-lg">{milestone.title}</CardTitle>
                                  <CardDescription>{milestone.description}</CardDescription>
                                </div>
                              </div>
                              <Badge variant={isCompleted ? 'default' : 'secondary'}>
                                {milestone.reward_points} pts
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {isCompleted ? 'Completed!' : `${Math.floor(progress)}% complete`}
                                </span>
                                <span className="font-medium">
                                  {isCompleted ? milestone.target : `${Math.min(
                                    userStats?.[`${category}_${category === 'poaps' ? 'owned' : category === 'posts' ? 'created' : category === 'votes' ? 'cast' : 'given'}` as keyof UserStats] as number || 0,
                                    milestone.target
                                  )}/${milestone.target}`}
                                </span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
