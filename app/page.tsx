'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { checkPOAPOwnership } from '@/lib/stacks';
import { 
  Wallet, 
  Vote, 
  MessageSquare, 
  Trophy, 
  Award,
  TrendingUp,
  Users,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export default function DashboardPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [hasPOAP, setHasPOAP] = useState(false);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalProposals: 0,
    totalUsers: 0,
    activeVotes: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    loadPlatformStats();
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

  const loadPlatformStats = async () => {
    const [postsData, proposalsData, usersData] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('proposals').select('id', { count: 'exact', head: true }),
      supabase.from('user_stats').select('user_address', { count: 'exact', head: true }),
    ]);

    const activeProposals = await supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    setStats({
      totalPosts: postsData.count || 0,
      totalProposals: proposalsData.count || 0,
      totalUsers: usersData.count || 0,
      activeVotes: activeProposals.count || 0,
    });
  };

  const features = [
    {
      icon: <Award className="h-8 w-8" />,
      title: 'Mint POAPs',
      description: 'Create proof of attendance protocol NFTs for your events on Stacks blockchain',
      href: '/mint',
      color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
      badge: 'NFT',
    },
    {
      icon: <Vote className="h-8 w-8" />,
      title: 'Vote on Proposals',
      description: 'Participate in community governance with multiple choice voting',
      href: '/vote',
      color: 'from-purple-500/10 to-pink-500/10 border-purple-500/20',
      badge: 'Governance',
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: 'Create Posts',
      description: 'Share your thoughts and engage with the community (POAP holders only)',
      href: '/posts',
      color: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
      badge: 'Community',
    },
    {
      icon: <Trophy className="h-8 w-8" />,
      title: 'Track Milestones',
      description: 'Complete achievements and earn rewards for your contributions',
      href: '/milestones',
      color: 'from-orange-500/10 to-amber-500/10 border-orange-500/20',
      badge: 'Rewards',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">POAP Platform</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/mint" className="text-sm font-medium hover:text-primary transition-colors">
                Mint
              </Link>
              <Link href="/vote" className="text-sm font-medium hover:text-primary transition-colors">
                Vote
              </Link>
              <Link href="/posts" className="text-sm font-medium hover:text-primary transition-colors">
                Posts
              </Link>
              <Link href="/milestones" className="text-sm font-medium hover:text-primary transition-colors">
                Milestones
              </Link>
            </nav>

            {!isConnected ? (
              <Button onClick={connectWallet}>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant={hasPOAP ? 'default' : 'secondary'} className="font-mono">
                  {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6">
            Built on Stacks Blockchain
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            Decentralized Community Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Mint POAPs, participate in governance, create content, and earn rewards. 
            All powered by Stacks smart contracts.
          </p>
          
          {!isConnected ? (
            <Button onClick={connectWallet} size="lg" className="text-lg px-8">
              <Wallet className="mr-2 h-5 w-5" />
              Get Started
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <Link href="/mint">
                <Button size="lg" className="text-lg px-8">
                  Explore Platform
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold mb-1">{stats.totalPosts}</p>
                <p className="text-sm text-muted-foreground">Total Posts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Vote className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold mb-1">{stats.totalProposals}</p>
                <p className="text-sm text-muted-foreground">Proposals</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold mb-1">{stats.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold mb-1">{stats.activeVotes}</p>
                <p className="text-sm text-muted-foreground">Active Votes</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Platform Features</h2>
            <p className="text-muted-foreground text-lg">
              Everything you need for decentralized community engagement
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Link key={index} href={feature.href}>
                <Card className={`border-2 hover:shadow-lg transition-all duration-300 h-full bg-gradient-to-br ${feature.color}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-14 w-14 rounded-xl bg-background flex items-center justify-center text-primary">
                        {feature.icon}
                      </div>
                      <Badge variant="secondary">{feature.badge}</Badge>
                    </div>
                    <CardTitle className="text-2xl mb-2">{feature.title}</CardTitle>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full justify-between group">
                      Learn more
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">POAP Platform</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built on Stacks • Powered by Supabase
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
